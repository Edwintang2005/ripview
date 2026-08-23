import {
    DEFAULT_MODES,
    SELECTABLE_MODES,
    colourForLine,
    exclusionsForModes,
    isVehicleMode,
    modeFromProductClass,
    modeLabel,
    parseModes,
} from './modes';

describe('modeFromProductClass', () => {
    it('maps the documented product classes', () => {
        expect(modeFromProductClass(1)).toBe('train');
        expect(modeFromProductClass(4)).toBe('lightRail');
        expect(modeFromProductClass(5)).toBe('bus');
        expect(modeFromProductClass(7)).toBe('coach');
        expect(modeFromProductClass(9)).toBe('ferry');
        expect(modeFromProductClass(11)).toBe('schoolBus');
        expect(modeFromProductClass(99)).toBe('walk');
        expect(modeFromProductClass(100)).toBe('walk');
        expect(modeFromProductClass(107)).toBe('cycle');
    });

    it('maps metro, which the v3.3 documentation omits but production returns', () => {
        expect(modeFromProductClass(2)).toBe('metro');
    });

    it('degrades to unknown rather than throwing on a new class', () => {
        expect(modeFromProductClass(42)).toBe('unknown');
        expect(modeFromProductClass(undefined)).toBe('unknown');
    });
});

describe('isVehicleMode', () => {
    it('separates ridden legs from walking and cycling', () => {
        expect(isVehicleMode('train')).toBe(true);
        expect(isVehicleMode('ferry')).toBe(true);
        expect(isVehicleMode('walk')).toBe(false);
        expect(isVehicleMode('cycle')).toBe(false);
        expect(isVehicleMode('unknown')).toBe(false);
    });
});

describe('colourForLine', () => {
    it('uses the line brand colour when there is one', () => {
        expect(colourForLine('train', 'T1')).toBe('#F99D1D');
        expect(colourForLine('train', 'T4')).toBe('#005BA4');
        expect(colourForLine('metro', 'M1')).toBe('#00959B');
    });

    it('matches case-insensitively and ignores trailing text', () => {
        expect(colourForLine('train', 't1')).toBe('#F99D1D');
        expect(colourForLine('train', 'T1 North Shore & Western Line')).toBe('#F99D1D');
    });

    it('falls back to the mode colour for lines without their own', () => {
        // Bus routes, intercity lines and light rail lines have no entry.
        expect(colourForLine('bus', '607X')).toBe('#00B5EF');
        expect(colourForLine('ferry', 'F1')).toBe('#5AB031');
        expect(colourForLine('train', 'Central Coast & Newcastle Line')).toBe('#F6891F');
        expect(colourForLine('walk', undefined)).toBe('#6E838D');
    });
});

describe('exclusionsForModes', () => {
    it('excludes every mode the user did not choose', () => {
        // TfNSW works by exclusion, so trains-only means excluding the rest.
        expect(exclusionsForModes(['train']).sort((a, b) => a - b)).toEqual([2, 4, 5, 7, 9, 11]);
    });

    it('excludes nothing when every mode is allowed', () => {
        expect(exclusionsForModes(SELECTABLE_MODES)).toEqual([]);
    });

    it('excludes only school buses by default', () => {
        expect(exclusionsForModes(DEFAULT_MODES)).toEqual([11]);
    });

    it('reproduces the old hardcoded trains-and-metro-only behaviour', () => {
        expect(exclusionsForModes(['train', 'metro']).sort((a, b) => a - b)).toEqual([4, 5, 7, 9, 11]);
    });
});

describe('parseModes', () => {
    it('falls back to the defaults for missing or empty input', () => {
        expect(parseModes(null)).toEqual(DEFAULT_MODES);
        expect(parseModes([])).toEqual(DEFAULT_MODES);
    });

    it('discards values it does not recognise', () => {
        expect(parseModes(['train', 'teleport', 'ferry'])).toEqual(['train', 'ferry']);
    });

    it('falls back when nothing survives, so a search is never impossible', () => {
        expect(parseModes(['teleport'])).toEqual(DEFAULT_MODES);
    });
});

describe('modeLabel', () => {
    it('labels every mode', () => {
        for (const mode of SELECTABLE_MODES) {
            expect(modeLabel(mode)).toBeTruthy();
        }
        expect(modeLabel('walk')).toBe('Walk');
    });
});
