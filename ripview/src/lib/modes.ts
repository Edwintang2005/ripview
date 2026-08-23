/**
 * Modes of transport, and the colours used to present them.
 *
 * TfNSW identifies a mode by the numeric `transportation.product.class` on
 * every leg and stop event. That number — not the human-readable line name —
 * is the stable key. The previous `config/trainLineColours.ts` keyed off full
 * display names such as `'T1 North Shores & Western Line'`, which never
 * matched: the API returns `'Sydney Trains Network T1 North Shore & Western
 * Line'`. Line designators like `T1` and `M1` are stable; prose is not.
 */

import type { Mode, SelectableMode } from './types';

/**
 * `product.class` values, per the TfNSW Trip Planning API documentation v3.3
 * (section 4.3.1). Class 2 (Metro) is absent from that document but is
 * returned in production.
 */
const CLASS_TO_MODE: Record<number, Mode> = {
    1: 'train',
    2: 'metro',
    4: 'lightRail',
    5: 'bus',
    7: 'coach',
    9: 'ferry',
    11: 'schoolBus',
    99: 'walk',
    100: 'walk',
    107: 'cycle',
};

/** The `exclMOT_<n>` request parameter number for each mode the user can turn off. */
const MODE_TO_CLASS: Record<SelectableMode, number> = {
    train: 1,
    metro: 2,
    lightRail: 4,
    bus: 5,
    coach: 7,
    ferry: 9,
    schoolBus: 11,
};

/** Modes offered in the UI, in the order they should be listed. */
export const SELECTABLE_MODES: SelectableMode[] = [
    'train',
    'metro',
    'bus',
    'ferry',
    'lightRail',
    'coach',
    'schoolBus',
];

/** Modes enabled by default: everything a commuter would normally consider. */
export const DEFAULT_MODES: SelectableMode[] = [
    'train',
    'metro',
    'bus',
    'ferry',
    'lightRail',
    'coach',
];

const MODE_LABELS: Record<Mode, string> = {
    train: 'Train',
    metro: 'Metro',
    lightRail: 'Light rail',
    bus: 'Bus',
    coach: 'Coach',
    ferry: 'Ferry',
    schoolBus: 'School bus',
    walk: 'Walk',
    cycle: 'Cycle',
    unknown: 'Service',
};

/** Font Awesome-free inline glyphs, so no CDN request is needed for icons. */
const MODE_GLYPHS: Record<Mode, string> = {
    train: 'T',
    metro: 'M',
    lightRail: 'L',
    bus: 'B',
    coach: 'C',
    ferry: 'F',
    schoolBus: 'S',
    walk: '⏷',
    cycle: '⏷',
    unknown: '?',
};

/**
 * Official TfNSW mode colours, used when a line has no colour of its own.
 */
const MODE_COLOURS: Record<Mode, string> = {
    train: '#F6891F',
    metro: '#168388',
    lightRail: '#EE343F',
    bus: '#00B5EF',
    coach: '#742282',
    ferry: '#5AB031',
    schoolBus: '#742282',
    walk: '#6E838D',
    cycle: '#6E838D',
    unknown: '#6E838D',
};

/**
 * Per-line brand colours, keyed on the line designator.
 *
 * Values match the palette already embedded in
 * `public/map/Sydney_Trains_Network_Map.svg`, so the map and the trip list
 * agree. Lines without an entry (intercity and regional services, individual
 * bus routes) fall back to their mode colour.
 */
const LINE_COLOURS: Record<string, string> = {
    T1: '#F99D1D',
    T2: '#0097CE',
    T3: '#F36F23',
    T4: '#005BA4',
    T5: '#C42490',
    T6: '#7C3D20',
    T7: '#6E838D',
    T8: '#00964C',
    T9: '#D32030',
    M1: '#00959B',
};

/** Maps a TfNSW `product.class` to a domain mode. */
export function modeFromProductClass(productClass: number | undefined): Mode {
    if (productClass === undefined) {
        return 'unknown';
    }
    return CLASS_TO_MODE[productClass] ?? 'unknown';
}

/** True for legs the traveller rides rather than walks or cycles. */
export function isVehicleMode(mode: Mode): boolean {
    return mode !== 'walk' && mode !== 'cycle' && mode !== 'unknown';
}

export function modeLabel(mode: Mode): string {
    return MODE_LABELS[mode];
}

export function modeGlyph(mode: Mode): string {
    return MODE_GLYPHS[mode];
}

/**
 * The colour for a line, preferring its own brand colour over its mode's.
 *
 * `lineNumber` is matched case-insensitively and only on the leading
 * designator, so `T1`, `t1` and `T1 North Shore` all resolve to the T1 colour.
 */
export function colourForLine(mode: Mode, lineNumber: string | undefined): string {
    if (lineNumber) {
        const designator = /^([TML]\d+)/i.exec(lineNumber.trim());
        if (designator) {
            const colour = LINE_COLOURS[designator[1].toUpperCase()];
            if (colour) {
                return colour;
            }
        }
    }
    return MODE_COLOURS[mode];
}

/**
 * Builds the `exclMOT_<n>` exclusions for a set of chosen modes.
 *
 * TfNSW works by exclusion: anything not excluded is allowed. So we exclude
 * every selectable mode the user did *not* choose. Passing every mode returns
 * an empty set, which lets the API consider everything.
 */
export function exclusionsForModes(modes: readonly SelectableMode[]): number[] {
    const chosen = new Set(modes);
    return SELECTABLE_MODES
        .filter((mode) => !chosen.has(mode))
        .map((mode) => MODE_TO_CLASS[mode]);
}

/** Parses a persisted mode list, discarding anything unrecognised. */
export function parseModes(raw: readonly string[] | null | undefined): SelectableMode[] {
    if (!raw || raw.length === 0) {
        return [...DEFAULT_MODES];
    }
    const valid = raw.filter((value): value is SelectableMode =>
        (SELECTABLE_MODES as string[]).includes(value)
    );
    return valid.length > 0 ? valid : [...DEFAULT_MODES];
}
