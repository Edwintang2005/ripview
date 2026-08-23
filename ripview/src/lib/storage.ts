/**
 * Persistence for saved trips, saved stops and travel preferences.
 *
 * `localStorage` is deliberate: saved trips are per-device, need no account,
 * and must survive being closed and reopened from the home screen. Keys are
 * versioned so a future shape change can migrate rather than crash.
 *
 * Every read tolerates absent, corrupt and foreign data — a user's saved trips
 * are not worth throwing an uncaught exception on the home screen for.
 */

import { parseModes } from './modes';
import type { SelectableMode } from './types';

const SAVED_TRIPS_KEY = 'ripview.savedTrips.v1';
const SAVED_STOPS_KEY = 'ripview.savedStops.v1';
const PREFERENCES_KEY = 'ripview.preferences.v1';

/** How many saved trips to keep. Beyond this the home screen stops being a shortcut. */
export const MAX_SAVED_TRIPS = 12;

/** A station pair the user travels regularly. */
export interface SavedTrip {
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
}

/** A stop the user wants a departure board for. */
export interface SavedStop {
    id: string;
    name: string;
}

export interface Preferences {
    modes: SelectableMode[];
    /** Only offer journeys TfNSW considers wheelchair accessible. */
    wheelchairOnly: boolean;
}

/** A stable identity for a trip, so the same pair is never saved twice. */
export function tripKey(fromId: string, toId: string): string {
    return `${fromId}>${toId}`;
}

function readJson<T>(key: string): T | null {
    // Server-rendered passes have no localStorage; callers read in an effect,
    // but guard anyway so a stray import cannot crash a render.
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        // Corrupt JSON, or storage blocked entirely (Safari private browsing).
        return null;
    }
}

function writeJson(key: string, value: unknown): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Quota exceeded or storage disabled. Losing a saved trip is
        // preferable to breaking the interaction that triggered the save.
    }
}

/** Keeps only entries that still have every field the UI needs. */
function isUsableTrip(value: unknown): value is SavedTrip {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const trip = value as Partial<SavedTrip>;
    return Boolean(trip.fromId && trip.toId && trip.fromName && trip.toName);
}

function isUsableStop(value: unknown): value is SavedStop {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const stop = value as Partial<SavedStop>;
    return Boolean(stop.id && stop.name);
}

export function loadSavedTrips(): SavedTrip[] {
    const raw = readJson<unknown[]>(SAVED_TRIPS_KEY);
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .filter(isUsableTrip)
        .map((trip) => ({ ...trip, id: trip.id || tripKey(trip.fromId, trip.toId) }))
        .slice(0, MAX_SAVED_TRIPS);
}

function persistTrips(trips: SavedTrip[]): SavedTrip[] {
    const capped = trips.slice(0, MAX_SAVED_TRIPS);
    writeJson(SAVED_TRIPS_KEY, capped);
    return capped;
}

/**
 * Saves a trip, newest first, replacing any existing entry for the same pair.
 *
 * Returns the new list so callers can set state from it directly rather than
 * re-reading storage.
 */
export function saveTrip(trip: Omit<SavedTrip, 'id'>): SavedTrip[] {
    const id = tripKey(trip.fromId, trip.toId);
    const existing = loadSavedTrips().filter((saved) => saved.id !== id);
    return persistTrips([{ ...trip, id }, ...existing]);
}

export function removeTrip(id: string): SavedTrip[] {
    return persistTrips(loadSavedTrips().filter((saved) => saved.id !== id));
}

export function isTripSaved(fromId: string, toId: string): boolean {
    const id = tripKey(fromId, toId);
    return loadSavedTrips().some((saved) => saved.id === id);
}

/** Swaps origin and destination — the commute home is the same trip reversed. */
export function reverseTrip(trip: SavedTrip): Omit<SavedTrip, 'id'> {
    return {
        fromId: trip.toId,
        fromName: trip.toName,
        toId: trip.fromId,
        toName: trip.fromName,
    };
}

export function loadSavedStops(): SavedStop[] {
    const raw = readJson<unknown[]>(SAVED_STOPS_KEY);
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw.filter(isUsableStop).slice(0, MAX_SAVED_TRIPS);
}

export function saveStop(stop: SavedStop): SavedStop[] {
    const existing = loadSavedStops().filter((saved) => saved.id !== stop.id);
    const next = [stop, ...existing].slice(0, MAX_SAVED_TRIPS);
    writeJson(SAVED_STOPS_KEY, next);
    return next;
}

export function removeStop(id: string): SavedStop[] {
    const next = loadSavedStops().filter((saved) => saved.id !== id);
    writeJson(SAVED_STOPS_KEY, next);
    return next;
}

export function isStopSaved(id: string): boolean {
    return loadSavedStops().some((saved) => saved.id === id);
}

export function loadPreferences(): Preferences {
    const raw = readJson<Partial<Preferences>>(PREFERENCES_KEY);
    return {
        modes: parseModes(raw?.modes),
        wheelchairOnly: raw?.wheelchairOnly === true,
    };
}

export function savePreferences(preferences: Preferences): Preferences {
    writeJson(PREFERENCES_KEY, preferences);
    return preferences;
}
