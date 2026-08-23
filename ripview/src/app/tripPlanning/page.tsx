'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import JourneyCard from '@/components/JourneyCard';
import Notice, { Loading } from '@/components/Notice';
import { planTripAction } from '@/app/actions/transport';
import { parseModes } from '@/lib/modes';
import { stationNameById } from '@/lib/stations';
import {
    apiDateTimeFromLocalInput,
    formatDayAndClock,
    localInputToInstant,
    toApiDateTime,
} from '@/lib/time';
import {
    isTripSaved,
    removeTrip,
    saveTrip,
    tripKey,
} from '@/lib/storage';
import type { Journey, RipViewError } from '@/lib/types';
import styles from './tripPlanning.module.css';

/**
 * Journey results.
 *
 * Every value shown here is read from the typed domain model. The previous
 * version received arrays of formatted strings and recovered data by splitting
 * them on English phrases — then re-filtered "arrive by" results by re-parsing
 * an en-AU date, silently dropping any journey whose text did not match.
 *
 * `depArrMacro=arr` already guarantees the arrival constraint, so there is no
 * client-side filtering of results at all.
 */
export default function TripPlanningPage() {
    return (
        // useSearchParams needs a Suspense boundary to prerender.
        <Suspense fallback={<TripPlanningShell><Loading label='Loading trip' /></TripPlanningShell>}>
            <TripPlanningContent />
        </Suspense>
    );
}

function TripPlanningShell({ children, title }: { children: ReactNode; title?: string }) {
    return (
        <div className={styles.page}>
            <AppHeader title={title ?? 'Trip'} backTo='/' />
            <main className={styles.main}>{children}</main>
            <Footer />
        </div>
    );
}

function TripPlanningContent() {
    const searchParams = useSearchParams();

    const fromId = searchParams.get('from') ?? '';
    const toId = searchParams.get('to') ?? '';
    // Prefer the name passed from the search — it covers stops that are not in
    // the bundled station list — and fall back to a local lookup for a
    // hand-written or bookmarked URL.
    const fromName = searchParams.get('fromName') ?? stationNameById(fromId) ?? 'Origin';
    const toName = searchParams.get('toName') ?? stationNameById(toId) ?? 'Destination';
    const when = searchParams.get('when');
    const depOrArr = searchParams.get('depArr') === 'arr' ? 'arr' : 'dep';
    const modes = parseModes(searchParams.get('modes')?.split(','));
    const wheelchairOnly = searchParams.get('wheelchair') === '1';

    const [journeys, setJourneys] = useState<Journey[] | null>(null);
    const [error, setError] = useState<RipViewError | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        setIsSaved(isTripSaved(fromId, toId));
    }, [fromId, toId]);

    useEffect(() => {
        let isCurrent = true;
        setIsLoading(true);
        setError(null);

        async function load() {
            if (!fromId || !toId) {
                if (isCurrent) {
                    setError({
                        kind: 'badRequest',
                        message: 'This link is missing a starting point or destination.',
                    });
                    setIsLoading(false);
                }
                return;
            }

            // A specific time is a bare wall-clock value; "now" is derived in
            // Sydney time so a traveller in another timezone still gets it right.
            const requested = when ? apiDateTimeFromLocalInput(when) : null;
            const { date, time } = requested ?? toApiDateTime(new Date());

            const result = await planTripAction({
                fromId: fromId,
                toId: toId,
                depOrArr: when && requested ? depOrArr : 'dep',
                date: date,
                time: time,
                modes: modes,
                wheelchairOnly: wheelchairOnly,
            });

            // The request may have been superseded by a refresh or a param change.
            if (!isCurrent) {
                return;
            }
            if (result.ok) {
                setJourneys(result.data);
                setRefreshedAt(new Date());
            } else {
                setJourneys(null);
                setError(result.error);
            }
            setIsLoading(false);
        }

        load();
        return () => {
            isCurrent = false;
        };
        // `modes` is a fresh array each render, so it is joined into a stable key.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromId, toId, when, depOrArr, wheelchairOnly, modes.join(','), reloadToken]);

    const toggleSaved = useCallback(() => {
        if (isSaved) {
            removeTrip(tripKey(fromId, toId));
            setIsSaved(false);
        } else {
            saveTrip({ fromId: fromId, fromName: fromName, toId: toId, toName: toName });
            setIsSaved(true);
        }
    }, [isSaved, fromId, toId, fromName, toName]);

    const timeLabel = when
        ? `${depOrArr === 'arr' ? 'Arriving by' : 'Departing'} ${formatDayAndClock(localInputToInstant(when)?.toISOString())}`
        : 'Departing now';

    return (
        <TripPlanningShell title={`${fromName} → ${toName}`}>
            <div className={styles.toolbar}>
                <div>
                    <h1 className={styles.heading}>
                        {fromName} <span aria-hidden='true'>→</span> {toName}
                    </h1>
                    <p className={styles.subheading}>{timeLabel}</p>
                </div>
                <div className={styles.toolbarActions}>
                    <button
                        type='button'
                        className={isSaved ? styles.savedButton : styles.saveButton}
                        onClick={toggleSaved}
                        aria-pressed={isSaved}
                    >
                        {isSaved ? 'Saved' : 'Save trip'}
                    </button>
                    <button
                        type='button'
                        className={styles.refreshButton}
                        onClick={() => setReloadToken((token) => token + 1)}
                        disabled={isLoading}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {isLoading && <Loading label={`Finding trips from ${fromName} to ${toName}`} />}

            {!isLoading && error && (
                <Notice
                    tone={error.kind === 'noResults' ? 'info' : 'error'}
                    title={
                        error.kind === 'noResults' ? 'No trips found' : 'Could not load trips'
                    }
                    action={
                        error.kind === 'auth' || error.kind === 'badRequest'
                            ? undefined
                            : <button
                                type='button'
                                className={styles.retryButton}
                                onClick={() => setReloadToken((token) => token + 1)}
                            >
                                Try again
                            </button>
                    }
                >
                    {error.message}
                </Notice>
            )}

            {!isLoading && journeys && (
                <>
                    <ol className={styles.results}>
                        {journeys.map((journey, index) => (
                            <li key={journey.id}>
                                <JourneyCard journey={journey} index={index} />
                            </li>
                        ))}
                    </ol>
                    {refreshedAt && (
                        <p className={styles.refreshed}>
                            {`Updated ${formatDayAndClock(refreshedAt.toISOString())}`}
                        </p>
                    )}
                </>
            )}
        </TripPlanningShell>
    );
}
