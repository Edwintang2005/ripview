import { formatClock, formatDelay } from '@/lib/time';
import type { StopCall } from '@/lib/types';
import styles from './StopTime.module.css';

interface StopTimeProps {
    call: StopCall;
    /** `lg` for the departure and arrival on a journey card. */
    size?: 'sm' | 'lg';
    /**
     * Show only the effective time, coloured if it is off schedule.
     *
     * Used for intermediate stops in a stopping pattern: a leg's delay applies
     * to every stop on it, so repeating "3 min late" twenty times down the list
     * is noise that also forces each row to wrap.
     */
    compact?: boolean;
}

/**
 * A stop time, showing the live estimate when there is one.
 *
 * Three states are deliberately distinct, because collapsing them is how a
 * timetable app loses trust:
 *
 *  - no real-time data: the scheduled time, plainly, with no live marker
 *  - running to time:   the scheduled time, marked live
 *  - running late:      the estimate prominently, the scheduled time struck
 *                       through beside it, and by how much
 */
export default function StopTime({ call, size = 'sm', compact = false }: StopTimeProps) {
    const delayLabel = formatDelay(call.delayMinutes);
    const hasLiveData = call.estimated !== undefined;
    const isOffSchedule = delayLabel !== null;
    const shownTime = isOffSchedule ? call.estimated : call.planned;

    if (compact) {
        return (
            <time
                className={`${styles.compact} ${isOffSchedule ? styles.adjusted : styles.time}`}
                // The detail the compact form drops is still announced.
                aria-label={delayLabel ? `${formatClock(shownTime)}, ${delayLabel}` : undefined}
            >
                {formatClock(shownTime)}
            </time>
        );
    }

    return (
        <span className={`${styles.wrapper} ${size === 'lg' ? styles.large : ''}`}>
            <time className={isOffSchedule ? styles.adjusted : styles.time}>
                {formatClock(shownTime)}
            </time>
            {isOffSchedule && (
                <time className={styles.scheduled}>{formatClock(call.planned)}</time>
            )}
            {hasLiveData && !isOffSchedule && (
                <span className={styles.onTime}>
                    <span aria-hidden='true' className={styles.liveDot} />
                    On time
                </span>
            )}
            {isOffSchedule && (
                <span
                    className={
                        (call.delayMinutes ?? 0) > 0 ? styles.late : styles.early
                    }
                >
                    {delayLabel}
                </span>
            )}
        </span>
    );
}
