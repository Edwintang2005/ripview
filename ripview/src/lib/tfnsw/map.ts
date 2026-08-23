/**
 * Pure mapping from TfNSW `rapidJSON` responses to RipView's domain model.
 *
 * Nothing in this file touches the network, the clock or the DOM, so all of it
 * is directly testable against captured response fixtures — see
 * `src/lib/tfnsw/map.test.ts`.
 *
 * The rule: this is the *only* place raw API shapes are interpreted. Downstream
 * code never sees a `RawLeg`, and never has to re-parse a formatted string to
 * recover a value.
 */

import {
    colourForLine,
    isVehicleMode,
    modeFromProductClass,
} from '../modes';
import { delayMinutes, minutesUntil, parseIso } from '../time';
import type {
    Departure,
    Fare,
    FareAvailability,
    Journey,
    Leg,
    Line,
    Mode,
    StopCall,
    StopSuggestion,
} from '../types';
import type {
    RawDepartureResponse,
    RawFareTicket,
    RawJourney,
    RawLeg,
    RawStop,
    RawStopEvent,
    RawStopFinderLocation,
    RawStopFinderResponse,
    RawTransportation,
    RawTripResponse,
} from './responses';

/**
 * Strips the trailing suburb from a stop name.
 *
 * TfNSW returns `name` as `Central Station, Platform 18, Sydney` and
 * `disassembledName` as `Central Station, Platform 18`. We want the bare
 * station for headings and the platform separately for the detail line.
 */
function shortenStopName(raw: RawStop): string {
    const base = raw.disassembledName ?? raw.name ?? '';
    return base.replace(/,\s*Platform\s+\S+$/i, '').replace(/,\s*Stand\s+\S+$/i, '').trim();
}

/** Pulls out just the platform or stand designator, when the name carries one. */
function platformOf(raw: RawStop): string | undefined {
    const base = raw.disassembledName ?? raw.name ?? '';
    const match = /,\s*(?:Platform|Stand)\s+(\S+?)(?:,|$)/i.exec(base);
    return match ? match[1] : undefined;
}

/**
 * Builds a `StopCall` from a raw stop.
 *
 * `use` selects which pair of timestamps to read. A leg's origin normally
 * carries only departure times and its destination only arrival times, but
 * intermediate stops carry both — so we prefer the requested direction and
 * fall back to the other rather than showing nothing.
 */
export function toStopCall(raw: RawStop, use: 'departure' | 'arrival'): StopCall {
    const preferPlanned = use === 'departure' ? raw.departureTimePlanned : raw.arrivalTimePlanned;
    const fallbackPlanned = use === 'departure' ? raw.arrivalTimePlanned : raw.departureTimePlanned;
    const preferEstimated =
        use === 'departure' ? raw.departureTimeEstimated : raw.arrivalTimeEstimated;
    const fallbackEstimated =
        use === 'departure' ? raw.arrivalTimeEstimated : raw.departureTimeEstimated;

    // An empty string is not a timestamp; treat it as absent.
    const planned = firstUsableTime(preferPlanned, fallbackPlanned);
    const estimated = firstUsableTime(preferEstimated, fallbackEstimated);

    return {
        id: raw.id,
        name: raw.name ?? raw.disassembledName ?? 'Unknown stop',
        shortName: shortenStopName(raw) || 'Unknown stop',
        platform: platformOf(raw),
        planned: planned ?? '',
        estimated: estimated,
        delayMinutes: delayMinutes(planned, estimated),
    };
}

function firstUsableTime(...candidates: (string | undefined)[]): string | undefined {
    for (const candidate of candidates) {
        if (parseIso(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

/**
 * Builds a `Line` from a leg's transportation block, or `undefined` when the
 * leg is walked or cycled.
 *
 * The field naming here is counter-intuitive and worth stating plainly, because
 * guessing it wrong produces plausible-looking but wrong labels:
 *
 * | field              | train                              | bus   |
 * |--------------------|------------------------------------|-------|
 * | `number`           | `T1 North Shore & Western Line`    | `440` |
 * | `disassembledName` | `T1`                               | `440` |
 * | `name`             | `Sydney Trains Network T1 North …` | `Sydney Buses Network 440` |
 *
 * So `disassembledName` — not `number` — is the short designator to put on a
 * badge, and the readable full name comes from `name` with the network prefix
 * removed. That prefix is exactly `product.name`, so it is stripped using the
 * response's own value rather than a hardcoded list of network names.
 */
export function toLine(raw: RawTransportation | undefined, mode: Mode): Line | undefined {
    if (!raw || !isVehicleMode(mode)) {
        return undefined;
    }
    const designator = (raw.disassembledName ?? raw.number ?? '').trim();
    const name = fullLineName(raw, designator);
    return {
        number: designator || name,
        name: name,
        destination: raw.destination?.name,
        mode: mode,
        colour: colourForLine(mode, designator || name),
    };
}

function fullLineName(raw: RawTransportation, designator: string): string {
    const networkPrefix = raw.product?.name?.trim();
    const fullName = raw.name?.trim();
    if (fullName && networkPrefix && fullName.startsWith(`${networkPrefix} `)) {
        return fullName.slice(networkPrefix.length + 1).trim();
    }
    // `number` carries the long name for rail; prefer it when it says more
    // than the designator alone.
    const numbered = raw.number?.trim();
    if (numbered && numbered.length > designator.length) {
        return numbered;
    }
    return fullName || designator;
}

/** Collects the user-facing text of any alerts attached to a leg. */
function toNotices(infos: RawLeg['infos']): string[] {
    if (!infos) {
        return [];
    }
    const seen = new Set<string>();
    for (const info of infos) {
        const text = (info.subtitle ?? '').trim();
        // `content` is HTML; the subtitle is the headline and is plain text.
        if (text) {
            seen.add(text);
        }
    }
    return [...seen];
}

export function toLeg(raw: RawLeg): Leg {
    const mode = modeFromProductClass(raw.transportation?.product?.class);
    const origin = toStopCall(raw.origin ?? {}, 'departure');
    const destination = toStopCall(raw.destination ?? {}, 'arrival');
    const stops = (raw.stopSequence ?? []).map((stop, index, all) => {
        // The first entry mirrors the leg origin, the last the destination.
        if (index === 0) {
            return toStopCall(stop, 'departure');
        }
        if (index === all.length - 1) {
            return toStopCall(stop, 'arrival');
        }
        return toStopCall(stop, 'departure');
    });

    return {
        mode: mode,
        line: toLine(raw.transportation, mode),
        origin: origin,
        destination: destination,
        stops: stops,
        durationSeconds: raw.duration ?? fallbackDuration(origin, destination),
        distanceMetres: raw.distance,
        isRealtime: Boolean(origin.estimated ?? destination.estimated),
        notices: toNotices(raw.infos),
    };
}

/** Derives a duration when the API omits one, rather than showing zero. */
function fallbackDuration(origin: StopCall, destination: StopCall): number {
    const from = parseIso(origin.estimated ?? origin.planned);
    const to = parseIso(destination.estimated ?? destination.planned);
    if (!from || !to) {
        return 0;
    }
    return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
}

const FARE_AVAILABILITY: Record<string, FareAvailability> = {
    nswFareEnabled: 'full',
    nswFarePartiallyEnabled: 'partial',
    nswFareNotAvailable: 'none',
    nswFareNotEnabled: 'none',
};

/**
 * Extracts the adult Opal fare from a journey.
 *
 * Exactly one ticket per fare level carries `evaluationTicket` in its
 * properties — that is the whole-journey summary; the rest are per-leg. The
 * value of `evaluationTicket` says how much of the journey could be priced, so
 * a total is never presented as authoritative when it is only partial.
 *
 * Returns `undefined` when TfNSW sends no tickets at all, which is common:
 * fare calculation is not enabled on every API key.
 */
export function toFare(raw: RawJourney['fare']): Fare | undefined {
    const tickets = raw?.tickets ?? [];
    if (tickets.length === 0) {
        return undefined;
    }
    const adultTickets = tickets.filter((ticket) => ticket.person === 'ADULT');
    const summary = adultTickets.find(
        (ticket) => ticket.properties?.evaluationTicket !== undefined
    );
    if (!summary) {
        return undefined;
    }
    const evaluation = summary.properties?.evaluationTicket ?? '';
    return {
        adult: priceOf(summary),
        currency: summary.currency ?? 'AUD',
        availability: FARE_AVAILABILITY[evaluation] ?? 'none',
    };
}

function priceOf(ticket: RawFareTicket): number | undefined {
    return typeof ticket.priceBrutto === 'number' ? ticket.priceBrutto : undefined;
}

/**
 * Counts vehicle-to-vehicle changes.
 *
 * TfNSW supplies `interchanges`, but it is not always present, and a walking
 * leg between two platforms is not a "change" in the sense a traveller means.
 * So we count ridden legs and subtract one.
 */
function countInterchanges(legs: Leg[]): number {
    const ridden = legs.filter((leg) => isVehicleMode(leg.mode)).length;
    return Math.max(0, ridden - 1);
}

export function toJourney(raw: RawJourney): Journey | null {
    const legs = (raw.legs ?? []).map(toLeg);
    if (legs.length === 0) {
        return null;
    }
    const first = legs[0];
    const last = legs[legs.length - 1];
    const departure = first.origin;
    const arrival = last.destination;

    // A journey with no usable timestamp at either end cannot be displayed or
    // sorted, so it is dropped rather than rendered as an em dash.
    if (!parseIso(departure.planned) && !parseIso(departure.estimated)) {
        return null;
    }

    const durationSeconds = legs.reduce((total, leg) => total + leg.durationSeconds, 0);

    return {
        id: `${departure.planned}-${arrival.planned}-${legs.length}`,
        legs: legs,
        departure: departure,
        arrival: arrival,
        durationSeconds: durationSeconds || fallbackDuration(departure, arrival),
        interchanges: countInterchanges(legs),
        isRealtime: legs.some((leg) => leg.isRealtime),
        fare: toFare(raw.fare),
    };
}

/**
 * Maps a whole trip response.
 *
 * Journeys that cannot be represented are dropped individually rather than
 * failing the entire response — one malformed option should not cost the user
 * the other nine.
 */
export function toJourneys(response: RawTripResponse): Journey[] {
    const raw = response.journeys ?? [];
    return raw
        .map(toJourney)
        .filter((journey): journey is Journey => journey !== null);
}

const CANCELLED_STATUSES = new Set(['TRIP_CANCELLED', 'MONITORING_CANCELLED']);

export function toDeparture(raw: RawStopEvent, now: Date): Departure | null {
    const mode = modeFromProductClass(raw.transportation?.product?.class);
    const line = toLine(raw.transportation, mode);
    if (!line) {
        return null;
    }
    const call = toStopCall(
        {
            ...(raw.location ?? {}),
            departureTimePlanned: raw.departureTimePlanned,
            departureTimeEstimated: raw.departureTimeEstimated,
        },
        'departure'
    );
    if (!parseIso(call.planned) && !parseIso(call.estimated)) {
        return null;
    }
    const statuses = raw.realtimeStatus ?? [];
    return {
        id: `${line.number}-${call.planned}-${call.id ?? ''}`,
        line: line,
        towards: raw.transportation?.destination?.name ?? 'Unknown destination',
        call: call,
        minutesUntil: minutesUntil(call.estimated ?? call.planned, now),
        isCancelled: statuses.some((status) => CANCELLED_STATUSES.has(status)),
    };
}

/**
 * How far into the past a departure may be and still be listed.
 *
 * TfNSW answers from the whole minute we asked about, so the first result is
 * routinely a service that left seconds ago. One minute of grace keeps a
 * just-departed service visible — useful when you are running for it — without
 * filling the board with history.
 */
const DEPARTED_GRACE_MINUTES = -1;

/**
 * Maps a departure board response, ordered by the time the traveller will
 * actually see the vehicle leave.
 *
 * Ordering and filtering both use the real-time estimate where there is one,
 * so a delayed service moves down the board as it slips.
 */
export function toDepartures(response: RawDepartureResponse, now: Date = new Date()): Departure[] {
    const events = response.stopEvents ?? [];
    return events
        .map((event) => toDeparture(event, now))
        .filter((departure): departure is Departure => departure !== null)
        .filter((departure) => departure.minutesUntil >= DEPARTED_GRACE_MINUTES)
        // Sort on the instant, not on `minutesUntil`: TfNSW gives bus estimates
        // to the second, and rounding to whole minutes before sorting would put
        // a 23:51:36 service ahead of a 23:51:00 one.
        .sort((a, b) => effectiveTime(a) - effectiveTime(b));
}

/** The moment a departure will actually happen, as far as we know. */
function effectiveTime(departure: Departure): number {
    const instant = parseIso(departure.call.estimated ?? departure.call.planned);
    return instant ? instant.getTime() : Number.MAX_SAFE_INTEGER;
}

/** Location types worth offering as a trip endpoint. */
const USEFUL_STOP_TYPES = new Set(['stop', 'platform', 'poi', 'singlehouse', 'street', 'locality']);

export function toStopSuggestions(response: RawStopFinderResponse): StopSuggestion[] {
    const locations = response.locations ?? [];
    return locations
        .filter((location) => location.id && (location.name ?? location.disassembledName))
        .filter((location) => !location.type || USEFUL_STOP_TYPES.has(location.type))
        .map(toStopSuggestion)
        .sort((a, b) => b.matchQuality - a.matchQuality);
}

function toStopSuggestion(raw: RawStopFinderLocation): StopSuggestion {
    const modes = (raw.modes ?? [])
        .map(modeFromProductClass)
        .filter((mode) => mode !== 'unknown');
    return {
        id: raw.id as string,
        name: raw.disassembledName ?? raw.name ?? '',
        locality: localityOf(raw),
        // De-duplicate while preserving the API's ordering.
        modes: [...new Set(modes)],
        matchQuality: raw.matchQuality ?? 0,
    };
}

/** Walks up the parent chain to find the suburb, for disambiguation. */
function localityOf(raw: RawStopFinderLocation): string | undefined {
    let parent = raw.parent;
    while (parent) {
        if (parent.type === 'locality' && parent.name) {
            return parent.name;
        }
        parent = parent.parent;
    }
    return undefined;
}
