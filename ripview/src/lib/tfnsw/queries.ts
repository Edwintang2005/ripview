/**
 * Request builders for the TfNSW endpoints RipView uses.
 *
 * Each one takes a small, named-field object and returns the domain result.
 * Server actions are thin wrappers over these (see `src/app/actions/`), which
 * keeps the request parameters in one reviewable place rather than spread as
 * positional arguments across call sites.
 */

import { exclusionsForModes } from '../modes';
import type {
    Departure,
    Journey,
    Result,
    SelectableMode,
    StopSuggestion,
} from '../types';
import { tfnswGet } from './client';
import { toDepartures, toJourneys, toStopSuggestions } from './map';
import type {
    RawDepartureResponse,
    RawStopFinderResponse,
    RawTripResponse,
} from './responses';

/** How many journey options to ask for. Ten fills a screen without paging. */
const JOURNEYS_PER_REQUEST = 10;

export interface TripQuery {
    /** Origin stop id — a TSN such as `200060`, or a global id such as `10101100`. */
    fromId: string;
    toId: string;
    /** Whether `date`/`time` is a departure or an arrival deadline. */
    depOrArr: 'dep' | 'arr';
    /** `YYYYMMDD`, Sydney wall-clock. */
    date: string;
    /** `HHMM`, Sydney wall-clock. */
    time: string;
    /** Modes to allow. Anything omitted is excluded from the search. */
    modes: readonly SelectableMode[];
    /** Restrict results to wheelchair-accessible journeys. */
    wheelchairOnly?: boolean;
}

/**
 * Turns chosen modes into the `exclMOT_<n>` parameters the API expects.
 *
 * TfNSW works by exclusion, and the exclusions only take effect when
 * `excludedMeans=checkbox` is also sent.
 */
function modeParams(modes: readonly SelectableMode[]): Record<string, string | undefined> {
    const excluded = exclusionsForModes(modes);
    if (excluded.length === 0) {
        return {};
    }
    const params: Record<string, string | undefined> = { excludedMeans: 'checkbox' };
    for (const productClass of excluded) {
        params[`exclMOT_${productClass}`] = '1';
    }
    return params;
}

/**
 * Plans a trip.
 *
 * Note that `depArrMacro=arr` already guarantees every returned journey
 * arrives no later than the requested time, sorted closest-to-deadline first.
 * There is deliberately no client-side re-filtering of the results.
 */
export async function fetchJourneys(query: TripQuery): Promise<Result<Journey[]>> {
    if (!query.fromId || !query.toId) {
        return {
            ok: false,
            error: { kind: 'badRequest', message: 'Choose both a starting point and a destination.' },
        };
    }
    if (query.fromId === query.toId) {
        return {
            ok: false,
            error: {
                kind: 'badRequest',
                message: 'The starting point and destination are the same place.',
            },
        };
    }

    const response = await tfnswGet<RawTripResponse>('trip', {
        depArrMacro: query.depOrArr,
        type_origin: 'any',
        name_origin: query.fromId,
        type_destination: 'any',
        name_destination: query.toId,
        itdDate: query.date,
        itdTime: query.time,
        calcNumberOfTrips: JOURNEYS_PER_REQUEST,
        wheelchair: query.wheelchairOnly ? 'on' : undefined,
        // Enables real-time estimates on the returned stop times.
        TfNSWTR: 'true',
        ...modeParams(query.modes),
    });

    if (!response.ok) {
        return response;
    }

    const journeys = toJourneys(response.data);
    if (journeys.length === 0) {
        return {
            ok: false,
            error: {
                kind: 'noResults',
                message: messageForEmptyTrip(response.data),
            },
        };
    }
    return { ok: true, data: journeys };
}

/**
 * Prefers TfNSW's own explanation of an empty result over a generic one — it
 * usually says something specific, e.g. that the date is outside the timetable.
 */
function messageForEmptyTrip(response: RawTripResponse): string {
    const messages = response.systemMessages?.responseMessages ?? [];
    const text = messages.map((message) => message.text?.trim()).find(Boolean);
    return text || 'No journeys were found for that time. Try a different time or allow more modes of transport.';
}

export interface DepartureQuery {
    /** The stop to show departures for. */
    stopId: string;
    /** `YYYYMMDD`, Sydney wall-clock. */
    date: string;
    /** `HHMM`, Sydney wall-clock. */
    time: string;
    modes: readonly SelectableMode[];
}

/** Fetches the next departures from a single stop — the departure board. */
export async function fetchDepartures(query: DepartureQuery): Promise<Result<Departure[]>> {
    if (!query.stopId) {
        return {
            ok: false,
            error: { kind: 'badRequest', message: 'No stop was given.' },
        };
    }

    const response = await tfnswGet<RawDepartureResponse>('departure_mon', {
        mode: 'direct',
        type_dm: 'stop',
        name_dm: query.stopId,
        depArrMacro: 'dep',
        itdDate: query.date,
        itdTime: query.time,
        TfNSWDM: 'true',
        ...modeParams(query.modes),
    });

    if (!response.ok) {
        return response;
    }

    const departures = toDepartures(response.data);
    if (departures.length === 0) {
        return {
            ok: false,
            error: {
                kind: 'noResults',
                message: 'No upcoming departures were found from this stop.',
            },
        };
    }
    return { ok: true, data: departures };
}

/** Minimum characters before searching, to avoid querying on every keystroke. */
export const MIN_STOP_QUERY_LENGTH = 3;

/**
 * Searches for stops, stations, wharves and addresses by name.
 *
 * This is the live alternative to the vendored station snapshot: it covers
 * every mode and stays current without a data refresh.
 */
export async function fetchStopSuggestions(query: string): Promise<Result<StopSuggestion[]>> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_STOP_QUERY_LENGTH) {
        return { ok: true, data: [] };
    }

    const response = await tfnswGet<RawStopFinderResponse>('stop_finder', {
        type_sf: 'any',
        name_sf: trimmed,
        TfNSWSF: 'true',
        anyMaxSizeHitList: 15,
    });

    if (!response.ok) {
        return response;
    }
    return { ok: true, data: toStopSuggestions(response.data) };
}
