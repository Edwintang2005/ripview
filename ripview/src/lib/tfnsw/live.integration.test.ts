/**
 * @jest-environment node
 */
import { fetchDepartures, fetchJourneys, fetchStopSuggestions } from './queries';
import { toApiDateTime } from '../time';

jest.setTimeout(45_000);

const { date, time } = toApiDateTime(new Date());

describe('live TfNSW', () => {
    it('plans a trip with all modes', async () => {
        const r = await fetchJourneys({
            fromId: '200060', toId: '214710', depOrArr: 'dep', date, time,
            modes: ['train', 'metro', 'bus', 'ferry', 'lightRail', 'coach'],
        });
        console.log('TRIP ok=', r.ok, r.ok ? '' : r.error);
        if (r.ok) {
            for (const j of r.data.slice(0, 3)) {
                console.log(`  dep ${j.departure.planned} arr ${j.arrival.planned} ${Math.round(j.durationSeconds / 60)}min changes=${j.interchanges} rt=${j.isRealtime} fare=${JSON.stringify(j.fare)}`);
                for (const l of j.legs) {
                    console.log(`     ${l.mode.padEnd(9)} ${(l.line?.number ?? '-').padEnd(8)} ${l.origin.shortName} p${l.origin.platform ?? '-'} -> ${l.destination.shortName} | stops=${l.stops.length} delay=${l.origin.delayMinutes} notices=${l.notices.length}`);
                }
            }
        }
        expect(r.ok).toBe(true);
    });

    it('restricts to trains only', async () => {
        const r = await fetchJourneys({
            fromId: '200060', toId: '214710', depOrArr: 'dep', date, time, modes: ['train'],
        });
        console.log('TRAIN-ONLY ok=', r.ok, r.ok ? r.data.flatMap(j => j.legs.map(l => l.mode)).join(',') : r.error);
        expect(r.ok).toBe(true);
        if (r.ok) {
            const modes = new Set(r.data.flatMap(j => j.legs.map(l => l.mode)));
            expect([...modes].every(m => m === 'train' || m === 'walk')).toBe(true);
        }
    });

    it('rejects same origin and destination without calling the API', async () => {
        const r = await fetchJourneys({ fromId: '200060', toId: '200060', depOrArr: 'dep', date, time, modes: ['train'] });
        expect(r.ok).toBe(false);
        if (!r.ok) { expect(r.error.kind).toBe('badRequest'); }
    });

    it('fetches a departure board', async () => {
        const r = await fetchDepartures({ stopId: '200060', date, time, modes: ['train', 'metro', 'bus', 'ferry', 'lightRail', 'coach'] });
        console.log('DEPARTURES ok=', r.ok, r.ok ? '' : r.error);
        if (r.ok) {
            for (const d of r.data.slice(0, 8)) {
                console.log(`  ${String(d.minutesUntil).padStart(3)}min ${d.line.number.padEnd(6)} ${d.line.mode.padEnd(9)} -> ${d.towards} | p${d.call.platform ?? '-'} delay=${d.call.delayMinutes} cancelled=${d.isCancelled}`);
            }
        }
        expect(r.ok).toBe(true);
    });

    it('searches stops live', async () => {
        const r = await fetchStopSuggestions('Wynyard');
        console.log('STOPS ok=', r.ok, r.ok ? '' : r.error);
        if (r.ok) {
            for (const s of r.data.slice(0, 6)) { console.log(`  ${s.id.padEnd(10)} ${s.name} | ${s.locality ?? '-'} | ${s.modes.join(',')} q=${s.matchQuality}`); }
        }
        expect(r.ok).toBe(true);
    });

    it('returns a typed auth error for a bad key', async () => {
        const real = process.env.TPNSWAPIKEY;
        process.env.TPNSWAPIKEY = 'apikey definitely-not-valid';
        const r = await fetchJourneys({ fromId: '200060', toId: '214710', depOrArr: 'dep', date, time, modes: ['train'] });
        process.env.TPNSWAPIKEY = real;
        console.log('BAD KEY ->', r.ok ? 'unexpectedly ok' : r.error);
        expect(r.ok).toBe(false);
        if (!r.ok) { expect(r.error.kind).toBe('auth'); }
    });
});
