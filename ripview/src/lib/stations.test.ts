import { STATIONS, searchStations, stationNameById } from './stations';

describe('the bundled station list', () => {
    it('contains every train and metro station from the dataset', () => {
        expect(STATIONS).toHaveLength(382);
    });

    it('has a unique id for every entry', () => {
        const ids = new Set(STATIONS.map((station) => station.id));
        expect(ids.size).toBe(STATIONS.length);
    });

    it('has a usable name, id and coordinates for every entry', () => {
        for (const station of STATIONS) {
            expect(station.id).toMatch(/^\d+$/);
            expect(station.name.length).toBeGreaterThan(0);
            // Every NSW station sits in the southern hemisphere, east of 140°.
            expect(station.lat).toBeLessThan(0);
            expect(station.lon).toBeGreaterThan(140);
        }
    });
});

describe('searchStations', () => {
    it('ranks a prefix match above a match in the middle of a name', () => {
        const results = searchStations('central');
        expect(results[0].name).toBe('Central Station');
    });

    it('is case-insensitive and ignores surrounding whitespace', () => {
        expect(searchStations('  CENTRAL station ')[0].name).toBe('Central Station');
    });

    it('returns nothing for an empty query', () => {
        expect(searchStations('')).toEqual([]);
        expect(searchStations('   ')).toEqual([]);
    });

    it('returns nothing for a query that matches no station', () => {
        expect(searchStations('Hogsmeade')).toEqual([]);
    });

    it('respects the result limit', () => {
        expect(searchStations('station', 5)).toHaveLength(5);
    });

    it('reports metro stations as serving both train and metro', () => {
        const [chatswood] = searchStations('Chatswood Station');
        expect(chatswood.modes).toEqual(['train', 'metro']);
        const [aberdeen] = searchStations('Aberdeen Station');
        expect(aberdeen.modes).toEqual(['train']);
    });

    it('returns ids the trip planner accepts', () => {
        // 200060 is the TSN for Central, verified against the live API.
        expect(searchStations('Central Station')[0].id).toBe('200060');
    });
});

describe('stationNameById', () => {
    it('resolves a known id', () => {
        expect(stationNameById('200060')).toBe('Central Station');
    });

    it('returns null rather than throwing for an unknown or missing id', () => {
        // The old getStationNameFromId indexed into the filter result and threw
        // a TypeError here, taking the whole results page down.
        expect(stationNameById('999999999')).toBeNull();
        expect(stationNameById(null)).toBeNull();
        expect(stationNameById(undefined)).toBeNull();
        expect(stationNameById('')).toBeNull();
    });
});
