/**
 * RipView's domain model.
 *
 * These types are the boundary between the Transport for NSW API and the UI.
 * The TfNSW response is mapped into these shapes exactly once (see
 * `src/lib/tfnsw/mapTrip.ts` and `mapDepartures.ts`); everything downstream
 * works with real values — `Date`-parseable ISO strings, numbers, enums —
 * rather than pre-formatted display text.
 *
 * The previous implementation flattened the API response into arrays of
 * formatted strings and then re-parsed them in the view. Formatting is a
 * one-way operation: do it in the component, never in the fetch layer.
 */

/** Modes of transport, derived from `transportation.product.class`. */
export type Mode =
    | 'train'
    | 'metro'
    | 'lightRail'
    | 'bus'
    | 'coach'
    | 'ferry'
    | 'schoolBus'
    | 'walk'
    | 'cycle'
    | 'unknown';

/** A mode the user can include or exclude when planning. Walking is always allowed. */
export type SelectableMode = Extract<
    Mode,
    'train' | 'metro' | 'lightRail' | 'bus' | 'coach' | 'ferry' | 'schoolBus'
>;

/** A public transport line, e.g. T1, M1, 333, F1. */
export interface Line {
    /** Short designator as shown on the vehicle, e.g. `T1`, `M1`, `333`. */
    number: string;
    /** Full name as returned by the API, e.g. `T1 North Shore & Western Line`. */
    name: string;
    /** Where the service terminates, when the API provides it. */
    destination?: string;
    mode: Mode;
    /** Brand colour for the line, or the generic colour for its mode. */
    colour: string;
}

/**
 * A vehicle calling at a stop.
 *
 * `planned` is the timetable and is always present. `estimated` is the live
 * real-time value and is present only when TfNSW has one for that service.
 * Both are ISO 8601 strings in UTC, exactly as the API returns them — convert
 * to Australia/Sydney at render time.
 */
export interface StopCall {
    /** Stop or platform id, e.g. `2000451` for a specific Central platform. */
    id?: string;
    /** Full name including platform, e.g. `Central Station, Platform 18`. */
    name: string;
    /** Name with the platform and suburb stripped, e.g. `Central Station`. */
    shortName: string;
    /** Platform or stand designator on its own, e.g. `18`, when there is one. */
    platform?: string;
    /** Scheduled time, ISO 8601 UTC. */
    planned: string;
    /** Live estimate, ISO 8601 UTC. Absent when no real-time data exists. */
    estimated?: string;
    /**
     * Minutes late, derived from `estimated - planned`. Negative means early.
     * Absent when there is no real-time data to compare against.
     */
    delayMinutes?: number;
}

/** One continuous stage of a journey on a single vehicle, or on foot. */
export interface Leg {
    mode: Mode;
    /** Absent for walking and cycling legs. */
    line?: Line;
    origin: StopCall;
    destination: StopCall;
    /**
     * Every stop the vehicle calls at, in order, from `origin` to
     * `destination` inclusive. Empty for walking legs.
     */
    stops: StopCall[];
    durationSeconds: number;
    distanceMetres?: number;
    /** True when either end of the leg carries a live estimate. */
    isRealtime: boolean;
    /** Service alerts and notes attached to this leg by TfNSW. */
    notices: string[];
}

/** How much of a journey's fare TfNSW was able to calculate. */
export type FareAvailability = 'full' | 'partial' | 'none';

export interface Fare {
    /** Total adult Opal fare in dollars, when calculable. */
    adult?: number;
    currency: string;
    availability: FareAvailability;
}

/** One end-to-end travel option between an origin and a destination. */
export interface Journey {
    /** Stable key for React lists, derived from the journey's own times. */
    id: string;
    legs: Leg[];
    /** Departure from the first stop of the journey. */
    departure: StopCall;
    /** Arrival at the final stop of the journey. */
    arrival: StopCall;
    durationSeconds: number;
    /** Number of vehicle-to-vehicle changes. Walking legs do not count. */
    interchanges: number;
    /** True when any leg has live data. */
    isRealtime: boolean;
    fare?: Fare;
}

/** One upcoming service at a single stop — a row on a departure board. */
export interface Departure {
    id: string;
    line: Line;
    /** Where this service is headed. */
    towards: string;
    /** The stop this departure leaves from, with its times. */
    call: StopCall;
    /** Minutes from now until departure, using the live estimate when present. */
    minutesUntil: number;
    /** True when TfNSW flagged the service as cancelled. */
    isCancelled: boolean;
}

/** A stop returned by the live stop search, for autocomplete. */
export interface StopSuggestion {
    /** The id to pass back as an origin or destination. */
    id: string;
    name: string;
    /** Suburb or locality, for disambiguating same-named stops. */
    locality?: string;
    /** Modes served here, used to show mode icons in the list. */
    modes: Mode[];
    /** TfNSW's own relevance score; higher is a better match. */
    matchQuality: number;
}

/**
 * Whether a request succeeded, so failures can be rendered rather than thrown.
 *
 * Server actions cannot usefully propagate exceptions to the client, and a
 * rejected promise in a `useEffect` becomes a stuck loading spinner. Every
 * data-fetching entry point returns this instead.
 */
export type Result<T> =
    | { ok: true; data: T }
    | { ok: false; error: RipViewError };

export type ErrorKind =
    /** Key missing, wrong, or not authorised for this API. */
    | 'auth'
    /** TfNSW rate limit hit. */
    | 'rateLimit'
    /** Could not reach TfNSW at all. */
    | 'network'
    /** TfNSW answered, but with no usable result. */
    | 'noResults'
    /** The request itself was malformed, e.g. a missing station id. */
    | 'badRequest'
    | 'unknown';

export interface RipViewError {
    kind: ErrorKind;
    /** Message safe to show a user. */
    message: string;
}
