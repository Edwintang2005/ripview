/**
 * Time handling, in one place.
 *
 * Two rules govern every date in this app:
 *
 * 1. The TfNSW API speaks Sydney wall-clock time for requests (`itdDate` as
 *    `YYYYMMDD`, `itdTime` as `HHMM`) and UTC ISO 8601 for responses. Never
 *    hardcode an offset — Sydney observes daylight saving, so AEST/AEDT has to
 *    come from the IANA zone.
 * 2. Formatting happens here and in components, never in the fetch layer.
 */

/** The network's timezone. Everything user-facing is rendered in it. */
export const NETWORK_TIME_ZONE = 'Australia/Sydney';

/** The wall-clock fields of an instant, as observed in Sydney. */
interface SydneyParts {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
}

const PART_FORMATTER = new Intl.DateTimeFormat('en-AU', {
    timeZone: NETWORK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

function sydneyParts(instant: Date): SydneyParts {
    const parts = PART_FORMATTER.formatToParts(instant);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '';
    // `hour12: false` can render midnight as '24' in some engines.
    const hour = read('hour') === '24' ? '00' : read('hour');
    return {
        year: read('year'),
        month: read('month'),
        day: read('day'),
        hour,
        minute: read('minute'),
    };
}

/**
 * The `itdDate` / `itdTime` pair for an instant, in Sydney wall-clock terms.
 *
 * Used for "leave now" searches so that a user in another timezone still gets
 * the correct Sydney departure board.
 */
export function toApiDateTime(instant: Date): { date: string; time: string } {
    const parts = sydneyParts(instant);
    return {
        date: `${parts.year}${parts.month}${parts.day}`,
        time: `${parts.hour}${parts.minute}`,
    };
}

/**
 * Splits the value of an `<input type="datetime-local">` into API parameters.
 *
 * The value is a bare wall-clock string with no timezone, and it is passed
 * through literally: when someone types 18:00 they mean 18:00 at the station,
 * whatever timezone their device is in.
 *
 * Returns `null` when the value is not a well-formed `YYYY-MM-DDTHH:mm`, so
 * a hand-edited query string cannot produce a malformed API request.
 */
export function apiDateTimeFromLocalInput(
    value: string | null | undefined
): { date: string; time: string } | null {
    if (!value) {
        return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) {
        return null;
    }
    const [, year, month, day, hour, minute] = match;
    const monthNum = Number(month);
    const dayNum = Number(day);
    const hourNum = Number(hour);
    const minuteNum = Number(minute);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return null;
    }
    if (hourNum > 23 || minuteNum > 59) {
        return null;
    }
    return { date: `${year}${month}${day}`, time: `${hour}${minute}` };
}

/** The current Sydney wall-clock time as a `datetime-local` input value. */
export function nowAsLocalInputValue(now: Date = new Date()): string {
    const parts = sydneyParts(now);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const CLOCK_FORMATTER = new Intl.DateTimeFormat('en-AU', {
    timeZone: NETWORK_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

/** `HH:mm` in Sydney time. Returns an em dash for an unparseable input. */
export function formatClock(iso: string | undefined): string {
    const instant = parseIso(iso);
    return instant ? CLOCK_FORMATTER.format(instant) : '—';
}

const DAY_FORMATTER = new Intl.DateTimeFormat('en-AU', {
    timeZone: NETWORK_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});

/**
 * `Mon 24 Aug`, assembled from parts.
 *
 * Formatting the whole pattern at once yields `Mon, 24 Aug` in en-AU, which
 * then reads as `Mon, 24 Aug, 12:30` once the time is appended — two commas
 * doing one comma's job.
 */
function formatDayPart(instant: Date): string {
    const parts = DAY_FORMATTER.formatToParts(instant);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '';
    return `${read('weekday')} ${read('day')} ${read('month')}`.trim();
}

/**
 * A human date-and-time, omitting the date when it is today.
 *
 * e.g. `09:56` for today, `Sat 23 Aug, 09:56` otherwise.
 */
export function formatDayAndClock(iso: string | undefined, now: Date = new Date()): string {
    const instant = parseIso(iso);
    if (!instant) {
        return '—';
    }
    if (isSameSydneyDay(instant, now)) {
        return CLOCK_FORMATTER.format(instant);
    }
    return `${formatDayPart(instant)}, ${CLOCK_FORMATTER.format(instant)}`;
}

/** True when both instants fall on the same calendar day in Sydney. */
export function isSameSydneyDay(a: Date, b: Date): boolean {
    const pa = sydneyParts(a);
    const pb = sydneyParts(b);
    return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** `1h 05m`, `47m`, or `now` for anything under a minute. */
export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 60) {
        return 'under a minute';
    }
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
        return `${minutes}m`;
    }
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** Whole minutes from `from` to `iso`, rounded down. Negative when in the past. */
export function minutesUntil(iso: string | undefined, from: Date = new Date()): number {
    const instant = parseIso(iso);
    if (!instant) {
        return 0;
    }
    return Math.floor((instant.getTime() - from.getTime()) / 60_000);
}

/**
 * Minutes late, from the scheduled and estimated times of a single stop call.
 *
 * Returns `undefined` when there is no real-time estimate, which is different
 * from a delay of zero — "on time" and "no live data" must not look the same.
 */
export function delayMinutes(
    planned: string | undefined,
    estimated: string | undefined
): number | undefined {
    const plannedAt = parseIso(planned);
    const estimatedAt = parseIso(estimated);
    if (!plannedAt || !estimatedAt) {
        return undefined;
    }
    return Math.round((estimatedAt.getTime() - plannedAt.getTime()) / 60_000);
}

/**
 * `Date.parse` that rejects rather than returning `Invalid Date`.
 *
 * TfNSW occasionally returns an empty string instead of omitting a time field,
 * and `new Date('')` is a silent `NaN` that poisons every downstream
 * comparison.
 */
export function parseIso(value: string | undefined | null): Date | null {
    if (!value) {
        return null;
    }
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? null : instant;
}

/** A short label for how late something is, or `null` when it is on time. */
export function formatDelay(delay: number | undefined): string | null {
    if (delay === undefined || delay === 0) {
        return null;
    }
    if (delay < 0) {
        return `${Math.abs(delay)} min early`;
    }
    return `${delay} min late`;
}
