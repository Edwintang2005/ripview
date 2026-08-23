/**
 * Integration checks against the live Transport for NSW API.
 *
 * These are excluded from `npm test` — they need network access and a valid
 * `TPNSWAPIKEY`, and they assert on data that changes minute to minute. Run
 * them deliberately when you want to confirm the request layer still matches
 * the real API:
 *
 *     npm run test:live
 *
 * They are the counterpart to `map.test.ts`: that file pins the mapping against
 * frozen fixtures, this one confirms the fixtures still resemble production.
 *
 * @jest-environment node
 */

import { toApiDateTime } from '../time';
import { fetchDepartures, fetchJourneys, fetchStopSuggestions } from './queries';
import type { SelectableMode } from '../types';

jest.setTimeout(45_000);

const { date, time } = toApiDateTime(new Date());

/** Central Station and Seven Hills Station, as TSNs. */
const CENTRAL = '200060';
const SEVEN_HILLS = '214710';

const ALL_MODES: SelectableMode[] = [
    'train',
    'metro',
    'bus',
    'ferry',
    'lightRail',
    'coach',
];

describe('live Transport for NSW API', () => {
    it('plans a multi-modal trip', async () => {
        const result = await fetchJourneys({
            fromId: CENTRAL,
            toId: SEVEN_HILLS,
            depOrArr: 'dep',
            date: date,
            time: time,
            modes: ALL_MODES,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.data.length).toBeGreaterThan(0);

        for (const journey of result.data) {
            // Every journey must have a usable departure time and at least one leg.
            expect(journey.legs.length).toBeGreaterThan(0);
            expect(Date.parse(journey.departure.planned)).not.toBeNaN();
            expect(journey.durationSeconds).toBeGreaterThan(0);
            for (const leg of journey.legs) {
                // 'unknown' means a product class we failed to recognise.
                expect(leg.mode).not.toBe('unknown');
            }
        }
    });

    it('returns real-time estimates, not only the timetable', async () => {
        const result = await fetchJourneys({
            fromId: CENTRAL,
            toId: SEVEN_HILLS,
            depOrArr: 'dep',
            date: date,
            time: time,
            modes: ALL_MODES,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        // TfNSWTR=true should yield a live estimate on at least one journey.
        expect(result.data.some((journey) => journey.isRealtime)).toBe(true);
    });

    it('honours the mode filter', async () => {
        const result = await fetchJourneys({
            fromId: CENTRAL,
            toId: SEVEN_HILLS,
            depOrArr: 'dep',
            date: date,
            time: time,
            modes: ['train'],
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        const modes = new Set(result.data.flatMap((journey) => journey.legs.map((leg) => leg.mode)));
        // Walking legs are always allowed; no other vehicle mode should appear.
        expect([...modes].every((mode) => mode === 'train' || mode === 'walk')).toBe(true);
    });

    it('rejects a same-origin-and-destination request without calling the API', async () => {
        const result = await fetchJourneys({
            fromId: CENTRAL,
            toId: CENTRAL,
            depOrArr: 'dep',
            date: date,
            time: time,
            modes: ALL_MODES,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.kind).toBe('badRequest');
        }
    });

    it('fetches a departure board with live delays', async () => {
        const result = await fetchDepartures({
            stopId: CENTRAL,
            date: date,
            time: time,
            modes: ALL_MODES,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.data.length).toBeGreaterThan(0);
        for (const departure of result.data) {
            // Departures already gone are filtered out.
            expect(departure.minutesUntil).toBeGreaterThanOrEqual(-1);
            expect(departure.line.number).toBeTruthy();
            expect(departure.towards).toBeTruthy();
        }
    });

    it('searches stops across every mode', async () => {
        const result = await fetchStopSuggestions('Wynyard');

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].id).toBeTruthy();
    });

    it('does not call the API for a query below the minimum length', async () => {
        const result = await fetchStopSuggestions('Wy');
        expect(result).toEqual({ ok: true, data: [] });
    });

    it('reports a bad API key as an auth error rather than throwing', async () => {
        const realKey = process.env.TPNSWAPIKEY;
        process.env.TPNSWAPIKEY = 'apikey definitely-not-a-valid-key';
        try {
            const result = await fetchJourneys({
                fromId: CENTRAL,
                toId: SEVEN_HILLS,
                depOrArr: 'dep',
                date: date,
                time: time,
                modes: ALL_MODES,
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.kind).toBe('auth');
                expect(result.error.message).toContain('TPNSWAPIKEY');
            }
        } finally {
            process.env.TPNSWAPIKEY = realKey;
        }
    });
});
