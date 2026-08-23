/**
 * Tests for request construction and result handling, with the HTTP layer
 * mocked so they run offline and without an API key.
 *
 * The parameters built here are worth pinning: the previous implementation
 * passed 29 positional arguments to a generated client, and its hardcoded
 * `exclMOT_*` values silently excluded every bus, ferry, light rail and coach
 * leg. A wrong parameter produces a plausible-looking empty result, not an
 * error, so only a test catches it.
 */

import { fetchDepartures, fetchJourneys, fetchStopSuggestions } from './queries';
import { tfnswGet } from './client';
import type { RawTripResponse } from './responses';
import tripFixture from './__fixtures__/trip.json';
import departuresFixture from './__fixtures__/departures.json';

jest.mock('./client', () => ({ tfnswGet: jest.fn() }));

const mockGet = tfnswGet as jest.MockedFunction<typeof tfnswGet>;

/** The parameters passed to the most recent request. */
function lastParams(): Record<string, string | number | undefined> {
    return mockGet.mock.calls[mockGet.mock.calls.length - 1][1];
}

function lastEndpoint(): string {
    return mockGet.mock.calls[mockGet.mock.calls.length - 1][0];
}

const BASE_TRIP = {
    fromId: '200060',
    toId: '214710',
    depOrArr: 'dep' as const,
    date: '20260823',
    time: '0956',
};

beforeEach(() => {
    mockGet.mockResolvedValue({ ok: true, data: tripFixture as RawTripResponse });
});

describe('fetchJourneys', () => {
    it('requests the trip endpoint with the journey parameters', async () => {
        await fetchJourneys({ ...BASE_TRIP, modes: ['train'] });

        expect(lastEndpoint()).toBe('trip');
        expect(lastParams()).toMatchObject({
            depArrMacro: 'dep',
            type_origin: 'any',
            name_origin: '200060',
            type_destination: 'any',
            name_destination: '214710',
            itdDate: '20260823',
            itdTime: '0956',
            // Without this, the response carries no real-time estimates at all.
            TfNSWTR: 'true',
        });
    });

    it('excludes every mode the user did not choose', async () => {
        await fetchJourneys({ ...BASE_TRIP, modes: ['train'] });
        const params = lastParams();
        // The exclusions only take effect alongside excludedMeans=checkbox.
        expect(params.excludedMeans).toBe('checkbox');
        expect(params.exclMOT_2).toBe('1'); // metro
        expect(params.exclMOT_4).toBe('1'); // light rail
        expect(params.exclMOT_5).toBe('1'); // bus
        expect(params.exclMOT_7).toBe('1'); // coach
        expect(params.exclMOT_9).toBe('1'); // ferry
        expect(params.exclMOT_11).toBe('1'); // school bus
        expect(params.exclMOT_1).toBeUndefined(); // train stays in
    });

    it('sends no exclusions when every mode is allowed', async () => {
        await fetchJourneys({
            ...BASE_TRIP,
            modes: ['train', 'metro', 'bus', 'ferry', 'lightRail', 'coach', 'schoolBus'],
        });
        const params = lastParams();
        expect(params.excludedMeans).toBeUndefined();
        expect(Object.keys(params).filter((key) => key.startsWith('exclMOT_'))).toEqual([]);
    });

    it('keeps buses and ferries when they are selected', async () => {
        // The regression this whole feature exists for.
        await fetchJourneys({ ...BASE_TRIP, modes: ['train', 'bus', 'ferry'] });
        const params = lastParams();
        expect(params.exclMOT_5).toBeUndefined();
        expect(params.exclMOT_9).toBeUndefined();
    });

    it('asks for wheelchair-accessible journeys only when requested', async () => {
        await fetchJourneys({ ...BASE_TRIP, modes: ['train'] });
        expect(lastParams().wheelchair).toBeUndefined();

        await fetchJourneys({ ...BASE_TRIP, modes: ['train'], wheelchairOnly: true });
        expect(lastParams().wheelchair).toBe('on');
    });

    it('passes arrive-by through, and does not re-filter the results', async () => {
        // depArrMacro=arr already guarantees the constraint. The old code
        // re-parsed formatted arrival strings and dropped anything that did not
        // match the expected text.
        const result = await fetchJourneys({
            ...BASE_TRIP,
            depOrArr: 'arr',
            modes: ['train'],
        });
        expect(lastParams().depArrMacro).toBe('arr');
        expect(result.ok && result.data).toHaveLength(3);
    });

    it('rejects a missing endpoint without calling the API', async () => {
        const result = await fetchJourneys({ ...BASE_TRIP, fromId: '', modes: ['train'] });
        expect(mockGet).not.toHaveBeenCalled();
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.kind).toBe('badRequest');
        }
    });

    it('rejects an origin equal to the destination without calling the API', async () => {
        const result = await fetchJourneys({ ...BASE_TRIP, toId: BASE_TRIP.fromId, modes: ['train'] });
        expect(mockGet).not.toHaveBeenCalled();
        expect(result.ok).toBe(false);
    });

    it('passes a transport error straight through', async () => {
        mockGet.mockResolvedValue({
            ok: false,
            error: { kind: 'auth', message: 'Bad key' },
        });
        const result = await fetchJourneys({ ...BASE_TRIP, modes: ['train'] });
        expect(result).toEqual({ ok: false, error: { kind: 'auth', message: 'Bad key' } });
    });

    it('reports an empty result as noResults rather than an empty success', async () => {
        mockGet.mockResolvedValue({ ok: true, data: { journeys: [] } });
        const result = await fetchJourneys({ ...BASE_TRIP, modes: ['train'] });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.kind).toBe('noResults');
        }
    });

    it('prefers TfNSW\'s own explanation of an empty result', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            data: {
                journeys: [],
                systemMessages: {
                    responseMessages: [{ code: '-8011', text: 'Date outside timetable period' }],
                },
            },
        });
        const result = await fetchJourneys({ ...BASE_TRIP, modes: ['train'] });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.message).toBe('Date outside timetable period');
        }
    });
});

describe('fetchDepartures', () => {
    beforeEach(() => {
        mockGet.mockResolvedValue({ ok: true, data: departuresFixture });
    });

    it('requests the departure monitor for a single stop', async () => {
        await fetchDepartures({
            stopId: '200060',
            date: '20260823',
            time: '0956',
            modes: ['train', 'metro', 'bus', 'ferry', 'lightRail', 'coach', 'schoolBus'],
        });
        expect(lastEndpoint()).toBe('departure_mon');
        expect(lastParams()).toMatchObject({
            mode: 'direct',
            type_dm: 'stop',
            name_dm: '200060',
            depArrMacro: 'dep',
            TfNSWDM: 'true',
        });
    });

    it('rejects a missing stop without calling the API', async () => {
        const result = await fetchDepartures({
            stopId: '',
            date: '20260823',
            time: '0956',
            modes: ['train'],
        });
        expect(mockGet).not.toHaveBeenCalled();
        expect(result.ok).toBe(false);
    });

    it('reports an empty board as noResults', async () => {
        mockGet.mockResolvedValue({ ok: true, data: { stopEvents: [] } });
        const result = await fetchDepartures({
            stopId: '200060',
            date: '20260823',
            time: '0956',
            modes: ['train'],
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.kind).toBe('noResults');
        }
    });
});

describe('fetchStopSuggestions', () => {
    it('does not call the API below the minimum query length', async () => {
        expect(await fetchStopSuggestions('Wy')).toEqual({ ok: true, data: [] });
        expect(await fetchStopSuggestions('   ')).toEqual({ ok: true, data: [] });
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('searches every location type so addresses and wharves are reachable', async () => {
        mockGet.mockResolvedValue({ ok: true, data: { locations: [] } });
        await fetchStopSuggestions('  Wynyard  ');
        expect(lastEndpoint()).toBe('stop_finder');
        expect(lastParams()).toMatchObject({
            type_sf: 'any',
            // Trimmed, so trailing spaces do not become part of the search.
            name_sf: 'Wynyard',
            TfNSWSF: 'true',
        });
    });

    it('returns an empty list rather than an error when nothing matches', async () => {
        mockGet.mockResolvedValue({ ok: true, data: { locations: null } });
        expect(await fetchStopSuggestions('Hogsmeade')).toEqual({ ok: true, data: [] });
    });
});
