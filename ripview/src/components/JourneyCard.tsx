'use client';

import { useState } from 'react';
import { formatClock, formatDelay, formatDuration } from '@/lib/time';
import { isVehicleMode, modeLabel } from '@/lib/modes';
import type { Journey, Leg } from '@/lib/types';
import LineBadge, { ModeBadge } from './LineBadge';
import StopTime from './StopTime';
import styles from './JourneyCard.module.css';

interface JourneyCardProps {
    journey: Journey;
    /** Position in the results list, used for the accessible heading. */
    index: number;
}

/**
 * One journey option: a summary line, the legs, and the stopping pattern on
 * demand.
 *
 * All of this comes from the typed domain model, so the interchange count, line
 * colours, platforms, delays and stop lists are read rather than inferred from
 * formatted text.
 */
export default function JourneyCard({ journey, index }: JourneyCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const ridden = journey.legs.filter((leg) => isVehicleMode(leg.mode));

    const departureLabel = formatDelay(journey.departure.delayMinutes);
    const departureIsLate = (journey.departure.delayMinutes ?? 0) > 0;
    const departureDelayed = departureLabel !== null;
    const arrivalDelayed = formatDelay(journey.arrival.delayMinutes) !== null;

    return (
        <article className={styles.card} aria-label={`Option ${index + 1}`}>
            <header className={styles.summary}>
                {/*
                 * The two times read as one line — `10:25 → 10:46` — with the
                 * delay as a chip underneath. Rendering the full StopTime at
                 * both ends put four values and two struck-through times on one
                 * row, which wrapped into an unreadable stack on a phone. The
                 * scheduled times are still available, in the leg details.
                 */}
                <p className={styles.times}>
                    <time className={departureDelayed ? styles.timeAdjusted : styles.time}>
                        {formatClock(journey.departure.estimated ?? journey.departure.planned)}
                    </time>
                    <span aria-hidden='true' className={styles.arrow}>
                        →
                    </span>
                    <time className={arrivalDelayed ? styles.timeAdjusted : styles.time}>
                        {formatClock(journey.arrival.estimated ?? journey.arrival.planned)}
                    </time>
                </p>
                <div className={styles.meta}>
                    <span className={styles.duration}>{formatDuration(journey.durationSeconds)}</span>
                    <span aria-hidden='true' className={styles.dot} />
                    <span>
                        {journey.interchanges === 0
                            ? 'Direct'
                            : `${journey.interchanges} change${journey.interchanges > 1 ? 's' : ''}`}
                    </span>
                    {journey.fare?.adult !== undefined && (
                        <>
                            <span aria-hidden='true' className={styles.dot} />
                            <span>
                                {`$${journey.fare.adult.toFixed(2)}`}
                                {journey.fare.availability === 'partial' && '+'}
                            </span>
                        </>
                    )}
                </div>
                <p className={styles.status}>
                    {departureLabel && (
                        <span className={departureIsLate ? styles.late : styles.early}>
                            {`Departs ${departureLabel}`}
                        </span>
                    )}
                    {!departureLabel && journey.isRealtime && (
                        <span className={styles.onTime}>
                            <span aria-hidden='true' className={styles.liveDot} />
                            On time
                        </span>
                    )}
                    {!journey.isRealtime && (
                        <span className={styles.scheduledOnly}>Timetable only</span>
                    )}
                </p>
            </header>

            {/* The route at a glance: the sequence of lines you will ride. */}
            <div className={styles.route}>
                {ridden.map((leg, legIndex) => (
                    <span className={styles.routeStep} key={`${leg.line?.number}-${legIndex}`}>
                        {legIndex > 0 && (
                            <span aria-hidden='true' className={styles.routeArrow}>
                                ›
                            </span>
                        )}
                        {leg.line ? <LineBadge line={leg.line} /> : <ModeBadge mode={leg.mode} />}
                    </span>
                ))}
            </div>

            <button
                type='button'
                className={styles.toggle}
                onClick={() => setIsExpanded((current) => !current)}
                aria-expanded={isExpanded}
            >
                {isExpanded ? 'Hide details' : 'Show details'}
            </button>

            {isExpanded && (
                <ol className={styles.legs}>
                    {journey.legs.map((leg, legIndex) => (
                        <LegDetail key={legIndex} leg={leg} />
                    ))}
                </ol>
            )}
        </article>
    );
}

function LegDetail({ leg }: { leg: Leg }) {
    const [showStops, setShowStops] = useState(false);
    // The first and last entries duplicate the leg's own origin and destination.
    const intermediateStops = leg.stops.slice(1, -1);

    return (
        <li className={styles.leg}>
            <div
                className={styles.legStripe}
                style={{ backgroundColor: leg.line?.colour ?? 'var(--border-strong)' }}
                aria-hidden='true'
            />
            <div className={styles.legBody}>
                <div className={styles.legHeading}>
                    {leg.line ? <LineBadge line={leg.line} size='md' /> : <ModeBadge mode={leg.mode} />}
                    <span className={styles.legName}>
                        {leg.line
                            ? `${leg.line.name}${leg.line.destination ? ` towards ${leg.line.destination}` : ''}`
                            : `${modeLabel(leg.mode)} ${formatDuration(leg.durationSeconds)}`}
                    </span>
                </div>

                <div className={styles.legStop}>
                    <StopTime call={leg.origin} />
                    <span className={styles.stopName}>
                        {leg.origin.shortName}
                        {leg.origin.platform && (
                            <span className={styles.platform}>{`Platform ${leg.origin.platform}`}</span>
                        )}
                    </span>
                </div>

                {intermediateStops.length > 0 && (
                    <>
                        <button
                            type='button'
                            className={styles.stopsToggle}
                            onClick={() => setShowStops((current) => !current)}
                            aria-expanded={showStops}
                        >
                            {`${intermediateStops.length} stop${intermediateStops.length > 1 ? 's' : ''} · ${formatDuration(leg.durationSeconds)}`}
                        </button>
                        {showStops && (
                            <ol className={styles.stopList}>
                                {intermediateStops.map((stop, stopIndex) => (
                                    <li className={styles.intermediateStop} key={`${stop.id}-${stopIndex}`}>
                                        <StopTime call={stop} compact />
                                        <span className={styles.intermediateName}>
                                            {stop.shortName}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </>
                )}

                {intermediateStops.length === 0 && (
                    <p className={styles.legDuration}>{formatDuration(leg.durationSeconds)}</p>
                )}

                <div className={styles.legStop}>
                    <StopTime call={leg.destination} />
                    <span className={styles.stopName}>
                        {leg.destination.shortName}
                        {leg.destination.platform && (
                            <span className={styles.platform}>
                                {`Platform ${leg.destination.platform}`}
                            </span>
                        )}
                    </span>
                </div>

                {leg.notices.length > 0 && (
                    <ul className={styles.notices}>
                        {leg.notices.map((notice) => (
                            <li key={notice}>{notice}</li>
                        ))}
                    </ul>
                )}
            </div>
        </li>
    );
}
