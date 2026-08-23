import { DEFAULT_MODES } from './modes';
import {
    MAX_SAVED_TRIPS,
    isStopSaved,
    isTripSaved,
    loadPreferences,
    loadSavedStops,
    loadSavedTrips,
    removeStop,
    removeTrip,
    reverseTrip,
    saveStop,
    savePreferences,
    saveTrip,
    tripKey,
} from './storage';

const CENTRAL_TO_HILLS = {
    fromId: '200060',
    fromName: 'Central Station',
    toId: '214710',
    toName: 'Seven Hills Station',
};

beforeEach(() => {
    window.localStorage.clear();
});

describe('saved trips', () => {
    it('starts empty', () => {
        expect(loadSavedTrips()).toEqual([]);
    });

    it('round-trips a saved trip', () => {
        saveTrip(CENTRAL_TO_HILLS);
        expect(loadSavedTrips()).toEqual([
            { ...CENTRAL_TO_HILLS, id: tripKey('200060', '214710') },
        ]);
        expect(isTripSaved('200060', '214710')).toBe(true);
        expect(isTripSaved('214710', '200060')).toBe(false);
    });

    it('puts the most recently saved trip first', () => {
        saveTrip(CENTRAL_TO_HILLS);
        saveTrip({ fromId: 'a', fromName: 'A', toId: 'b', toName: 'B' });
        expect(loadSavedTrips().map((trip) => trip.fromId)).toEqual(['a', '200060']);
    });

    it('does not duplicate the same pair, and moves it to the front', () => {
        saveTrip(CENTRAL_TO_HILLS);
        saveTrip({ fromId: 'a', fromName: 'A', toId: 'b', toName: 'B' });
        saveTrip(CENTRAL_TO_HILLS);
        const trips = loadSavedTrips();
        expect(trips).toHaveLength(2);
        expect(trips[0].fromId).toBe('200060');
    });

    it('treats the reverse direction as a separate trip', () => {
        // The commute in and the commute home are both worth a shortcut.
        saveTrip(CENTRAL_TO_HILLS);
        saveTrip(reverseTrip({ ...CENTRAL_TO_HILLS, id: 'x' }));
        expect(loadSavedTrips()).toHaveLength(2);
    });

    it('caps the list so the home screen stays a shortcut', () => {
        for (let index = 0; index < MAX_SAVED_TRIPS + 5; index += 1) {
            saveTrip({
                fromId: `from-${index}`,
                fromName: `From ${index}`,
                toId: `to-${index}`,
                toName: `To ${index}`,
            });
        }
        expect(loadSavedTrips()).toHaveLength(MAX_SAVED_TRIPS);
        // The newest survive, the oldest are dropped.
        expect(loadSavedTrips()[0].fromId).toBe(`from-${MAX_SAVED_TRIPS + 4}`);
    });

    it('removes a trip by id', () => {
        saveTrip(CENTRAL_TO_HILLS);
        const remaining = removeTrip(tripKey('200060', '214710'));
        expect(remaining).toEqual([]);
        expect(loadSavedTrips()).toEqual([]);
    });

    it('ignores a removal for an id that is not saved', () => {
        saveTrip(CENTRAL_TO_HILLS);
        expect(removeTrip('nonexistent')).toHaveLength(1);
    });

    it('survives corrupt stored data instead of throwing', () => {
        window.localStorage.setItem('ripview.savedTrips.v1', 'not json at all');
        expect(loadSavedTrips()).toEqual([]);
    });

    it('discards entries missing the fields the UI needs', () => {
        window.localStorage.setItem(
            'ripview.savedTrips.v1',
            JSON.stringify([
                { fromId: '1', toId: '2' },
                { ...CENTRAL_TO_HILLS, id: 'keep' },
                null,
                'nonsense',
            ])
        );
        const trips = loadSavedTrips();
        expect(trips).toHaveLength(1);
        expect(trips[0].id).toBe('keep');
    });

    it('backfills a missing id from the station pair', () => {
        window.localStorage.setItem(
            'ripview.savedTrips.v1',
            JSON.stringify([CENTRAL_TO_HILLS])
        );
        expect(loadSavedTrips()[0].id).toBe(tripKey('200060', '214710'));
    });
});

describe('reverseTrip', () => {
    it('swaps origin and destination, names included', () => {
        expect(reverseTrip({ ...CENTRAL_TO_HILLS, id: 'x' })).toEqual({
            fromId: '214710',
            fromName: 'Seven Hills Station',
            toId: '200060',
            toName: 'Central Station',
        });
    });
});

describe('saved stops', () => {
    it('round-trips a saved stop and de-duplicates it', () => {
        saveStop({ id: '200060', name: 'Central Station' });
        saveStop({ id: '200060', name: 'Central Station' });
        expect(loadSavedStops()).toHaveLength(1);
        expect(isStopSaved('200060')).toBe(true);
    });

    it('removes a stop', () => {
        saveStop({ id: '200060', name: 'Central Station' });
        expect(removeStop('200060')).toEqual([]);
    });

    it('survives corrupt stored data', () => {
        window.localStorage.setItem('ripview.savedStops.v1', '{');
        expect(loadSavedStops()).toEqual([]);
    });
});

describe('preferences', () => {
    it('defaults to the standard mode set with no accessibility filter', () => {
        expect(loadPreferences()).toEqual({ modes: DEFAULT_MODES, wheelchairOnly: false });
    });

    it('round-trips a saved selection', () => {
        savePreferences({ modes: ['train', 'ferry'], wheelchairOnly: true });
        expect(loadPreferences()).toEqual({ modes: ['train', 'ferry'], wheelchairOnly: true });
    });

    it('falls back to defaults when stored modes are unusable', () => {
        // Never leave the user unable to search because storage was edited.
        savePreferences({ modes: [], wheelchairOnly: false });
        expect(loadPreferences().modes).toEqual(DEFAULT_MODES);
        window.localStorage.setItem(
            'ripview.preferences.v1',
            JSON.stringify({ modes: ['teleport'] })
        );
        expect(loadPreferences().modes).toEqual(DEFAULT_MODES);
    });
});
