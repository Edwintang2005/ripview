/**
 * Tests for the API-to-domain mapping, run against fixtures captured from the
 * live production API (`__fixtures__/`).
 *
 * These exist because every bug this layer replaced was invisible: mode
 * detection reading `undefined`, times re-parsed out of formatted strings, and
 * journeys silently dropped by a filter. Each is pinned below.
 */

import {
    toDeparture,
    toDepartures,
    toFare,
    toJourneys,
    toLine,
    toStopCall,
    toStopSuggestions,
} from './map';
import type { RawStopEvent, RawTripResponse } from './responses';
import departuresFixture from './__fixtures__/departures.json';
import tripFixture from './__fixtures__/trip.json';

const trip = tripFixture as RawTripResponse;

describe('toJourneys', () => {
    const journeys = toJourneys(trip);

    it('maps every journey in the response', () => {
        expect(journeys).toHaveLength(3);
    });

    it('reads the real-time estimate, not just the timetable', () => {
        // The whole point of sending TfNSWTR=true. The previous implementation
        // requested real-time data and then only ever read *TimePlanned.
        const [direct] = journeys;
        expect(direct.departure.planned).toBe('2026-08-22T23:56:00Z');
        expect(direct.departure.estimated).toBe('2026-08-22T23:56:00Z');
        expect(direct.isRealtime).toBe(true);
        expect(direct.departure.delayMinutes).toBe(0);
    });

    it('identifies modes from product.class', () => {
        // Regression guard for the generated client's `_class` rename, which
        // made every one of these read `undefined` -> 'unknown'.
        expect(journeys[0].legs.map((leg) => leg.mode)).toEqual(['train']);
        expect(journeys[1].legs.map((leg) => leg.mode)).toEqual([
            'train',
            'walk',
            'bus',
            'bus',
        ]);
    });

    it('uses disassembledName as the short line designator', () => {
        const [railLeg, , busLeg] = journeys[1].legs;
        expect(railLeg.line?.number).toBe('T8');
        expect(railLeg.line?.name).toBe('T8 Airport & South Line');
        expect(busLeg.line?.number).toBe('607X');
    });

    it('colours lines from their designator', () => {
        expect(journeys[0].legs[0].line?.colour).toBe('#F99D1D');
        // A bus route has no line colour of its own, so it takes the mode's.
        expect(journeys[1].legs[2].line?.colour).toBe('#00B5EF');
    });

    it('gives walking legs no line', () => {
        const walk = journeys[1].legs[1];
        expect(walk.mode).toBe('walk');
        expect(walk.line).toBeUndefined();
    });

    it('counts interchanges as vehicle changes, ignoring walking legs', () => {
        // Fixture journey rides T8 -> 607X -> 611 with a walk in the middle:
        // three vehicles, so two changes. Matches TfNSW's own `interchanges`.
        expect(journeys[1].interchanges).toBe(2);
        expect(journeys[0].interchanges).toBe(0);
    });

    it('keeps the full stopping pattern for each leg', () => {
        const stops = journeys[0].legs[0].stops;
        expect(stops).toHaveLength(21);
        expect(stops[0].shortName).toBe('Central Station');
        expect(stops[0].platform).toBe('18');
        expect(stops[stops.length - 1].shortName).toBe('Seven Hills Station');
    });

    it('sums leg durations into a journey duration', () => {
        expect(journeys[0].durationSeconds).toBe(2490);
        expect(journeys[1].durationSeconds).toBe(162 + 300 + 1320 + 780);
    });

    it('returns an empty list rather than throwing on a null journeys field', () => {
        expect(toJourneys({ journeys: null })).toEqual([]);
        expect(toJourneys({})).toEqual([]);
    });

    it('drops a journey with no usable departure time instead of rendering a dash', () => {
        const malformed: RawTripResponse = {
            journeys: [
                { legs: [{ origin: { name: 'Nowhere' }, destination: { name: 'Elsewhere' } }] },
            ],
        };
        expect(toJourneys(malformed)).toEqual([]);
    });
});

describe('toStopCall', () => {
    it('separates the platform from the station name', () => {
        const call = toStopCall(
            {
                name: 'Central Station, Platform 18, Sydney',
                disassembledName: 'Central Station, Platform 18',
                departureTimePlanned: '2026-08-22T23:56:00Z',
            },
            'departure'
        );
        expect(call.shortName).toBe('Central Station');
        expect(call.platform).toBe('18');
        expect(call.name).toBe('Central Station, Platform 18, Sydney');
    });

    it('handles a bus stand as well as a rail platform', () => {
        const call = toStopCall(
            { disassembledName: 'QVB, York St, Stand C', departureTimePlanned: '2026-08-22T23:59:00Z' },
            'departure'
        );
        expect(call.platform).toBe('C');
        expect(call.shortName).toBe('QVB, York St');
    });

    it('treats an empty-string timestamp as absent', () => {
        // `new Date('')` is Invalid Date, which used to poison comparisons.
        const call = toStopCall(
            { name: 'Somewhere', departureTimePlanned: '2026-08-22T23:56:00Z', departureTimeEstimated: '' },
            'departure'
        );
        expect(call.estimated).toBeUndefined();
        expect(call.delayMinutes).toBeUndefined();
    });

    it('falls back to the other direction when the requested one is missing', () => {
        // Intermediate stops carry both; leg ends carry only one.
        const call = toStopCall({ name: 'Redfern', departureTimePlanned: '2026-08-22T23:59:00Z' }, 'arrival');
        expect(call.planned).toBe('2026-08-22T23:59:00Z');
    });

    it('distinguishes "on time" from "no live data"', () => {
        const onTime = toStopCall(
            {
                name: 'A',
                departureTimePlanned: '2026-08-22T23:56:00Z',
                departureTimeEstimated: '2026-08-22T23:56:00Z',
            },
            'departure'
        );
        const noData = toStopCall({ name: 'B', departureTimePlanned: '2026-08-22T23:56:00Z' }, 'departure');
        expect(onTime.delayMinutes).toBe(0);
        expect(noData.delayMinutes).toBeUndefined();
    });

    it('reports a delay in whole minutes', () => {
        const late = toStopCall(
            {
                name: 'C',
                departureTimePlanned: '2026-08-22T23:46:00Z',
                departureTimeEstimated: '2026-08-22T23:51:00Z',
            },
            'departure'
        );
        expect(late.delayMinutes).toBe(5);
    });
});

describe('toLine', () => {
    it('strips the network prefix using the response\'s own product name', () => {
        const line = toLine(
            {
                name: 'Sydney Trains Network T1 North Shore & Western Line',
                disassembledName: 'T1',
                number: 'T1 North Shore & Western Line',
                product: { class: 1, name: 'Sydney Trains Network' },
            },
            'train'
        );
        expect(line?.number).toBe('T1');
        expect(line?.name).toBe('T1 North Shore & Western Line');
    });

    it('handles a metro line', () => {
        const line = toLine(
            {
                name: 'Sydney Metro Network M1 Metro North West & Bankstown Line',
                disassembledName: 'M1',
                product: { class: 2, name: 'Sydney Metro Network' },
            },
            'metro'
        );
        expect(line?.number).toBe('M1');
        expect(line?.colour).toBe('#00959B');
    });

    it('returns undefined for a walking leg', () => {
        expect(toLine({ product: { class: 99 } }, 'walk')).toBeUndefined();
    });
});

describe('toFare', () => {
    it('returns undefined when TfNSW sends no tickets', () => {
        // Common in practice: fare calculation is not enabled on every key.
        expect(toFare({ tickets: [] })).toBeUndefined();
        expect(toFare(undefined)).toBeUndefined();
    });

    it('reads the adult total from the summary ticket only', () => {
        const fare = toFare({
            tickets: [
                { person: 'ADULT', priceBrutto: 2.5, currency: 'AUD' },
                { person: 'CHILD', priceBrutto: 1.2, properties: { evaluationTicket: 'nswFareEnabled' } },
                {
                    person: 'ADULT',
                    priceBrutto: 4.8,
                    currency: 'AUD',
                    properties: { evaluationTicket: 'nswFareEnabled' },
                },
            ],
        });
        expect(fare).toEqual({ adult: 4.8, currency: 'AUD', availability: 'full' });
    });

    it('marks a partially priceable journey as partial', () => {
        const fare = toFare({
            tickets: [
                {
                    person: 'ADULT',
                    priceBrutto: 3.2,
                    properties: { evaluationTicket: 'nswFarePartiallyEnabled' },
                },
            ],
        });
        expect(fare?.availability).toBe('partial');
    });
});

/** A minimal stop event, for tests about ordering and status. */
function stopEvent(designator: string, planned: string, estimated?: string): RawStopEvent {
    return {
        location: { id: `stop-${designator}`, name: 'Central Station, Platform 1' },
        transportation: {
            disassembledName: designator,
            product: { class: 1, name: 'Sydney Trains Network' },
            destination: { name: 'Somewhere' },
        },
        departureTimePlanned: planned,
        departureTimeEstimated: estimated,
    };
}

describe('toDepartures', () => {
    const now = new Date('2026-08-22T23:45:00Z');
    const departures = toDepartures(departuresFixture, now);

    it('maps a departure board and sorts it by actual departure time', () => {
        expect(departures.length).toBeGreaterThan(0);
        const minutes = departures.map((departure) => departure.minutesUntil);
        expect([...minutes]).toEqual([...minutes].sort((a, b) => a - b));
    });

    it('counts down using the live estimate rather than the timetable', () => {
        // Route 440 is scheduled 23:46 but estimated 23:51, so from 23:45 the
        // honest answer is 6 minutes, not 1.
        const bus440 = departures.find((departure) => departure.line.number === '440');
        expect(bus440?.minutesUntil).toBe(6);
        expect(bus440?.call.delayMinutes).toBe(5);
    });

    it('carries the destination through', () => {
        const bus440 = departures.find((departure) => departure.line.number === '440');
        expect(bus440?.towards).toBe('Grafton Street Bondi Jct');
    });

    it('identifies mixed modes at an interchange', () => {
        const modes = new Set(departures.map((departure) => departure.line.mode));
        expect(modes.has('train')).toBe(true);
        expect(modes.has('bus')).toBe(true);
        expect(modes.has('lightRail')).toBe(true);
    });

    it('flags a cancelled service', () => {
        const cancelled: RawStopEvent = {
            location: { id: '1', name: 'Central Station, Platform 1' },
            transportation: {
                disassembledName: 'T1',
                product: { class: 1, name: 'Sydney Trains Network' },
                destination: { name: 'Hornsby' },
            },
            departureTimePlanned: '2026-08-22T23:50:00Z',
            realtimeStatus: ['TRIP_CANCELLED'],
        };
        expect(toDeparture(cancelled, now)?.isCancelled).toBe(true);
    });

    it('drops services that have already gone, keeping one minute of grace', () => {
        // TfNSW answers from the whole minute asked about, so the first row is
        // routinely a service that left seconds ago.
        const later = new Date('2026-08-22T23:53:00Z');
        const board = toDepartures(departuresFixture, later);
        expect(board.every((departure) => departure.minutesUntil >= -1)).toBe(true);
        // The 23:46 bus (estimated 23:51) is two minutes gone by 23:53.
        expect(board.some((departure) => departure.line.number === '440')).toBe(false);
    });

    it('orders a delayed service by its estimate, not its timetable', () => {
        const board = toDepartures(
            {
                stopEvents: [
                    stopEvent('T1', '2026-08-22T23:50:00Z', '2026-08-22T23:58:00Z'),
                    stopEvent('T4', '2026-08-22T23:52:00Z', '2026-08-22T23:52:00Z'),
                ],
            },
            now
        );
        // T1 is scheduled first but is running eight minutes late, so the
        // on-time T4 is the one you will actually board first.
        expect(board.map((departure) => departure.line.number)).toEqual(['T4', 'T1']);
    });

    it('orders sub-minute estimates correctly', () => {
        // Bus estimates come with seconds. Rounding to whole minutes before
        // sorting would make these two indistinguishable.
        const board = toDepartures(
            {
                stopEvents: [
                    stopEvent('343', '2026-08-22T23:47:00Z', '2026-08-22T23:51:36Z'),
                    stopEvent('L3', '2026-08-22T23:50:00Z', '2026-08-22T23:51:00Z'),
                ],
            },
            now
        );
        expect(board.map((departure) => departure.line.number)).toEqual(['L3', '343']);
    });

    it('returns an empty list rather than throwing on a null field', () => {
        expect(toDepartures({ stopEvents: null })).toEqual([]);
    });
});

describe('toStopSuggestions', () => {
    it('ranks by match quality and reads the modes served', () => {
        const suggestions = toStopSuggestions({
            locations: [
                {
                    id: '10101100',
                    disassembledName: 'Central Station',
                    type: 'stop',
                    modes: [1, 2, 4, 5, 5],
                    matchQuality: 800,
                    parent: { type: 'locality', name: 'Sydney' },
                },
                {
                    id: '200060',
                    disassembledName: 'Central Station, Eddy Ave',
                    type: 'stop',
                    modes: [5],
                    matchQuality: 950,
                },
            ],
        });
        expect(suggestions.map((suggestion) => suggestion.id)).toEqual(['200060', '10101100']);
        // De-duplicated, and class 5 appears once.
        expect(suggestions[1].modes).toEqual(['train', 'metro', 'lightRail', 'bus']);
        expect(suggestions[1].locality).toBe('Sydney');
    });

    it('drops entries with no id', () => {
        expect(toStopSuggestions({ locations: [{ name: 'Nowhere' }] })).toEqual([]);
    });

    it('returns an empty list rather than throwing on a null field', () => {
        expect(toStopSuggestions({ locations: null })).toEqual([]);
    });
});
