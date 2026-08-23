import {
    apiDateTimeFromLocalInput,
    delayMinutes,
    formatClock,
    formatDayAndClock,
    formatDelay,
    formatDuration,
    isSameSydneyDay,
    minutesUntil,
    nowAsLocalInputValue,
    parseIso,
    toApiDateTime,
} from './time';

describe('toApiDateTime', () => {
    it('converts an instant to Sydney wall-clock API parameters', () => {
        // 2026-08-22T23:56Z is 2026-08-23 09:56 in Sydney (AEST, UTC+10).
        expect(toApiDateTime(new Date('2026-08-22T23:56:00Z'))).toEqual({
            date: '20260823',
            time: '0956',
        });
    });

    it('applies daylight saving without a hardcoded offset', () => {
        // January is AEDT (UTC+11), so the same UTC hour is an hour later.
        expect(toApiDateTime(new Date('2026-01-15T23:56:00Z'))).toEqual({
            date: '20260116',
            time: '1056',
        });
    });

    it('renders Sydney midnight as 0000, never 2400', () => {
        // 2026-08-22T14:00Z is exactly midnight in Sydney.
        expect(toApiDateTime(new Date('2026-08-22T14:00:00Z'))).toEqual({
            date: '20260823',
            time: '0000',
        });
    });
});

describe('apiDateTimeFromLocalInput', () => {
    it('passes a datetime-local value through as wall-clock time', () => {
        // No timezone shifting: 18:00 typed means 18:00 at the station.
        expect(apiDateTimeFromLocalInput('2026-08-23T18:00')).toEqual({
            date: '20260823',
            time: '1800',
        });
    });

    it('tolerates a seconds component', () => {
        expect(apiDateTimeFromLocalInput('2026-08-23T18:00:30')).toEqual({
            date: '20260823',
            time: '1800',
        });
    });

    it('rejects malformed input rather than building a bad request', () => {
        // A hand-edited query string must not reach the API as garbage.
        expect(apiDateTimeFromLocalInput('')).toBeNull();
        expect(apiDateTimeFromLocalInput(null)).toBeNull();
        expect(apiDateTimeFromLocalInput('tomorrow')).toBeNull();
        expect(apiDateTimeFromLocalInput('2026-13-01T10:00')).toBeNull();
        expect(apiDateTimeFromLocalInput('2026-08-23T25:00')).toBeNull();
        expect(apiDateTimeFromLocalInput('2026-08-23T10:99')).toBeNull();
    });
});

describe('nowAsLocalInputValue', () => {
    it('produces a value the datetime-local input accepts', () => {
        const value = nowAsLocalInputValue(new Date('2026-08-22T23:56:00Z'));
        expect(value).toBe('2026-08-23T09:56');
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
});

describe('formatClock', () => {
    it('renders UTC times in Sydney time', () => {
        expect(formatClock('2026-08-22T23:56:00Z')).toBe('09:56');
    });

    it('renders an em dash for a missing or unparseable time', () => {
        expect(formatClock(undefined)).toBe('—');
        expect(formatClock('')).toBe('—');
        expect(formatClock('not a date')).toBe('—');
    });
});

describe('formatDayAndClock', () => {
    const now = new Date('2026-08-23T00:00:00Z'); // 10:00 Sydney, 23 Aug

    it('omits the date when it is today in Sydney', () => {
        expect(formatDayAndClock('2026-08-23T02:30:00Z', now)).toBe('12:30');
    });

    it('includes the day when it is not today', () => {
        expect(formatDayAndClock('2026-08-24T02:30:00Z', now)).toBe('Mon 24 Aug, 12:30');
    });
});

describe('isSameSydneyDay', () => {
    it('compares calendar days in Sydney, not UTC', () => {
        // Both are 23 August in Sydney despite straddling UTC midnight.
        const a = new Date('2026-08-22T14:30:00Z');
        const b = new Date('2026-08-23T09:00:00Z');
        expect(isSameSydneyDay(a, b)).toBe(true);
    });

    it('separates different Sydney days', () => {
        expect(
            isSameSydneyDay(new Date('2026-08-22T13:00:00Z'), new Date('2026-08-22T15:00:00Z'))
        ).toBe(false);
    });
});

describe('formatDuration', () => {
    it('formats minutes under an hour', () => {
        expect(formatDuration(47 * 60)).toBe('47m');
    });

    it('formats hours and zero-padded minutes', () => {
        expect(formatDuration(2490)).toBe('42m'); // 41.5 minutes, rounded
        expect(formatDuration(3900)).toBe('1h 05m');
        expect(formatDuration(7200)).toBe('2h 00m');
    });

    it('handles missing or nonsensical values', () => {
        expect(formatDuration(0)).toBe('under a minute');
        expect(formatDuration(Number.NaN)).toBe('under a minute');
    });
});

describe('minutesUntil', () => {
    it('counts whole minutes from now', () => {
        const now = new Date('2026-08-22T23:45:00Z');
        expect(minutesUntil('2026-08-22T23:51:00Z', now)).toBe(6);
    });

    it('goes negative for a time in the past', () => {
        const now = new Date('2026-08-22T23:45:00Z');
        expect(minutesUntil('2026-08-22T23:40:00Z', now)).toBe(-5);
    });

    it('returns zero for an unusable time', () => {
        expect(minutesUntil(undefined)).toBe(0);
    });
});

describe('delayMinutes', () => {
    it('is undefined without a real-time estimate', () => {
        // "On time" and "no live data" must not be conflated.
        expect(delayMinutes('2026-08-22T23:46:00Z', undefined)).toBeUndefined();
        expect(delayMinutes('2026-08-22T23:46:00Z', '')).toBeUndefined();
    });

    it('is zero when running to time', () => {
        expect(delayMinutes('2026-08-22T23:46:00Z', '2026-08-22T23:46:00Z')).toBe(0);
    });

    it('is positive when late and negative when early', () => {
        expect(delayMinutes('2026-08-22T23:46:00Z', '2026-08-22T23:51:00Z')).toBe(5);
        expect(delayMinutes('2026-08-22T23:46:00Z', '2026-08-22T23:44:00Z')).toBe(-2);
    });

    it('rounds part-minute estimates', () => {
        // TfNSW returns second-level estimates for buses, e.g. 23:51:36.
        expect(delayMinutes('2026-08-22T23:47:00Z', '2026-08-22T23:51:36Z')).toBe(5);
    });
});

describe('formatDelay', () => {
    it('returns null when on time or unknown', () => {
        expect(formatDelay(0)).toBeNull();
        expect(formatDelay(undefined)).toBeNull();
    });

    it('describes late and early services', () => {
        expect(formatDelay(5)).toBe('5 min late');
        expect(formatDelay(-2)).toBe('2 min early');
    });
});

describe('parseIso', () => {
    it('rejects values that would become Invalid Date', () => {
        expect(parseIso('')).toBeNull();
        expect(parseIso(undefined)).toBeNull();
        expect(parseIso(null)).toBeNull();
        expect(parseIso('rubbish')).toBeNull();
    });

    it('accepts the API\'s timestamp format', () => {
        expect(parseIso('2026-08-22T23:56:00Z')?.toISOString()).toBe('2026-08-22T23:56:00.000Z');
    });
});
