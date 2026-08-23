'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import LineBadge from '@/components/LineBadge';
import Notice, { Loading } from '@/components/Notice';
import StopSearch from '@/components/StopSearch';
import StopTime from '@/components/StopTime';
import { departuresAction } from '@/app/actions/transport';
import { DEFAULT_MODES } from '@/lib/modes';
import { stationNameById } from '@/lib/stations';
import { toApiDateTime } from '@/lib/time';
import {
    isStopSaved,
    loadPreferences,
    loadSavedStops,
    removeStop,
    saveStop,
    type SavedStop,
} from '@/lib/storage';
import type { Departure, RipViewError } from '@/lib/types';
import styles from './departures.module.css';

/** How often to re-fetch the board while the page is open, in milliseconds. */
const AUTO_REFRESH_MS = 60_000;

/**
 * The departure board: what is leaving a stop, next.
 *
 * This is the screen the app was missing. The Departure API
 * (`/departure_mon`) was never called, so there was no way to answer "when is
 * the next train?" without planning a whole journey.
 */
export default function DeparturesPage() {
    return (
        <Suspense fallback={<Shell><Loading label='Loading departures' /></Shell>}>
            <DeparturesContent />
        </Suspense>
    );
}

function Shell({ children, title }: { children: ReactNode; title?: string }) {
    return (
        <div className={styles.page}>
            <AppHeader title={title} backTo={title ? '/departures' : undefined} />
            <main className={styles.main}>{children}</main>
            <Footer />
        </div>
    );
}

function DeparturesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const stopId = searchParams.get('stop') ?? '';
    const stopName = searchParams.get('name') ?? stationNameById(stopId) ?? '';

    const [departures, setDepartures] = useState<Departure[] | null>(null);
    const [error, setError] = useState<RipViewError | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(stopId));
    const [savedStops, setSavedStops] = useState<SavedStop[]>([]);
    const [isSaved, setIsSaved] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        setSavedStops(loadSavedStops());
    }, []);

    useEffect(() => {
        if (stopId) {
            setIsSaved(isStopSaved(stopId));
        }
    }, [stopId, savedStops]);

    useEffect(() => {
        if (!stopId) {
            setDepartures(null);
            setIsLoading(false);
            return;
        }

        let isCurrent = true;
        setIsLoading(true);
        setError(null);

        async function load() {
            const { date, time } = toApiDateTime(new Date());
            const preferences = loadPreferences();
            const result = await departuresAction({
                stopId: stopId,
                date: date,
                time: time,
                modes: preferences.modes.length > 0 ? preferences.modes : DEFAULT_MODES,
            });
            if (!isCurrent) {
                return;
            }
            if (result.ok) {
                setDepartures(result.data);
            } else {
                setDepartures(null);
                setError(result.error);
            }
            setIsLoading(false);
        }

        load();
        return () => {
            isCurrent = false;
        };
    }, [stopId, reloadToken]);

    // A departure board is stale the moment it renders, so refresh it while the
    // page is visible — and stop when it is not, rather than polling in the
    // background of a phone that has been put away.
    useEffect(() => {
        if (!stopId) {
            return;
        }
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                setReloadToken((token) => token + 1);
            }
        }, AUTO_REFRESH_MS);

        const refreshOnReturn = () => {
            if (document.visibilityState === 'visible') {
                setReloadToken((token) => token + 1);
            }
        };
        document.addEventListener('visibilitychange', refreshOnReturn);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', refreshOnReturn);
        };
    }, [stopId]);

    const openStop = useCallback(
        (stop: { id: string; name: string }) => {
            router.push(
                `/departures?stop=${encodeURIComponent(stop.id)}&name=${encodeURIComponent(stop.name)}`
            );
        },
        [router]
    );

    const toggleSaved = () => {
        if (isSaved) {
            setSavedStops(removeStop(stopId));
            setIsSaved(false);
        } else {
            setSavedStops(saveStop({ id: stopId, name: stopName || stopId }));
            setIsSaved(true);
        }
    };

    // No stop chosen yet: offer the saved list and a search.
    if (!stopId) {
        return (
            <Shell>
                <section className={styles.section}>
                    <h1 className={styles.pageHeading}>Departures</h1>
                    <p className={styles.lede}>
                        Pick a station, stop or wharf to see what is leaving next.
                    </p>
                    <StopSearch
                        label='Stop'
                        value={searchText}
                        onSelect={(stop) => {
                            setSearchText(stop?.name ?? '');
                            if (stop) {
                                openStop(stop);
                            }
                        }}
                        autoFocus
                    />
                </section>

                {savedStops.length > 0 && (
                    <section className={styles.section} aria-labelledby='saved-stops'>
                        <h2 className={styles.sectionHeading} id='saved-stops'>
                            Saved stops
                        </h2>
                        <ul className={styles.savedList}>
                            {savedStops.map((stop) => (
                                <li className={styles.savedItem} key={stop.id}>
                                    <button
                                        type='button'
                                        className={styles.savedMain}
                                        onClick={() => openStop(stop)}
                                    >
                                        {stop.name}
                                    </button>
                                    <button
                                        type='button'
                                        className={styles.savedRemove}
                                        onClick={() => setSavedStops(removeStop(stop.id))}
                                        aria-label={`Remove ${stop.name}`}
                                    >
                                        <span aria-hidden='true'>×</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </Shell>
        );
    }

    return (
        <Shell title={stopName || 'Departures'}>
            <div className={styles.toolbar}>
                <h1 className={styles.pageHeading}>{stopName || 'Departures'}</h1>
                <div className={styles.toolbarActions}>
                    <button
                        type='button'
                        className={isSaved ? styles.savedButton : styles.saveButton}
                        onClick={toggleSaved}
                        aria-pressed={isSaved}
                    >
                        {isSaved ? 'Saved' : 'Save stop'}
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

            {isLoading && !departures && <Loading label={`Loading departures from ${stopName}`} />}

            {!isLoading && error && (
                <Notice
                    tone={error.kind === 'noResults' ? 'info' : 'error'}
                    title={
                        error.kind === 'noResults'
                            ? 'Nothing leaving soon'
                            : 'Could not load departures'
                    }
                    action={
                        error.kind === 'auth'
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

            {departures && (
                <ul className={styles.board}>
                    {departures.map((departure) => (
                        <li
                            className={`${styles.row} ${departure.isCancelled ? styles.cancelled : ''}`}
                            key={departure.id}
                        >
                            <span className={styles.countdown}>
                                {departure.minutesUntil <= 0
                                    ? 'Now'
                                    : <>
                                        {departure.minutesUntil}
                                        <span className={styles.countdownUnit}>min</span>
                                    </>}
                            </span>
                            <span className={styles.rowBody}>
                                <span className={styles.rowTop}>
                                    <LineBadge line={departure.line} />
                                    <span className={styles.towards}>{departure.towards}</span>
                                </span>
                                <span className={styles.rowMeta}>
                                    <StopTime call={departure.call} />
                                    {departure.call.platform && (
                                        <span className={styles.platform}>
                                            {`Platform ${departure.call.platform}`}
                                        </span>
                                    )}
                                    {departure.isCancelled && (
                                        <span className={styles.cancelledTag}>Cancelled</span>
                                    )}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Shell>
    );
}
