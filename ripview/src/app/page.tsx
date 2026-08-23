'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import ModeFilter from '@/components/ModeFilter';
import Notice from '@/components/Notice';
import StopSearch from '@/components/StopSearch';
import { nowAsLocalInputValue } from '@/lib/time';
import {
    loadPreferences,
    loadSavedTrips,
    removeTrip,
    reverseTrip,
    savePreferences,
    saveTrip,
    type SavedTrip,
} from '@/lib/storage';
import type { SelectableMode } from '@/lib/types';
import { DEFAULT_MODES } from '@/lib/modes';
import styles from './page.module.css';

interface StopChoice {
    id: string;
    name: string;
}

/**
 * The home screen: saved trips first, then the planner.
 *
 * Saved trips lead because that is the actual daily interaction — "the usual
 * trip, now" — whereas planning a new journey is occasional. The previous home
 * screen offered only the form, so every commute meant retyping both stations.
 */
export default function Home() {
    const router = useRouter();

    const [from, setFrom] = useState<StopChoice | null>(null);
    const [to, setTo] = useState<StopChoice | null>(null);
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [useSpecificTime, setUseSpecificTime] = useState(false);
    const [depOrArr, setDepOrArr] = useState<'dep' | 'arr'>('dep');
    const [when, setWhen] = useState('');
    const [modes, setModes] = useState<SelectableMode[]>(DEFAULT_MODES);
    const [wheelchairOnly, setWheelchairOnly] = useState(false);
    const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [showOptions, setShowOptions] = useState(false);

    // Storage and the current time are only available in the browser, so both
    // are read after mount rather than during render.
    useEffect(() => {
        setSavedTrips(loadSavedTrips());
        const preferences = loadPreferences();
        setModes(preferences.modes);
        setWheelchairOnly(preferences.wheelchairOnly);
        setWhen(nowAsLocalInputValue());
    }, []);

    const persistPreferences = useCallback(
        (nextModes: SelectableMode[], nextWheelchair: boolean) => {
            setModes(nextModes);
            setWheelchairOnly(nextWheelchair);
            savePreferences({ modes: nextModes, wheelchairOnly: nextWheelchair });
        },
        []
    );

    const goToResults = useCallback(
        (origin: StopChoice, destination: StopChoice) => {
            const params = new URLSearchParams({
                from: origin.id,
                fromName: origin.name,
                to: destination.id,
                toName: destination.name,
                modes: modes.join(','),
            });
            if (wheelchairOnly) {
                params.set('wheelchair', '1');
            }
            if (useSpecificTime && when) {
                params.set('when', when);
                params.set('depArr', depOrArr);
            }
            router.push(`/tripPlanning?${params.toString()}`);
        },
        [modes, wheelchairOnly, useSpecificTime, when, depOrArr, router]
    );

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!from || !to) {
            setFormError('Choose a starting point and a destination from the suggestions.');
            return;
        }
        if (from.id === to.id) {
            setFormError('The starting point and destination are the same place.');
            return;
        }
        setFormError(null);
        saveTrip({ fromId: from.id, fromName: from.name, toId: to.id, toName: to.name });
        goToResults(from, to);
    };

    const swap = () => {
        setFrom(to);
        setTo(from);
        setFromText(to?.name ?? '');
        setToText(from?.name ?? '');
    };

    const openSaved = (trip: SavedTrip) => {
        goToResults(
            { id: trip.fromId, name: trip.fromName },
            { id: trip.toId, name: trip.toName }
        );
    };

    const openSavedReversed = (trip: SavedTrip) => {
        const reversed = reverseTrip(trip);
        goToResults(
            { id: reversed.fromId, name: reversed.fromName },
            { id: reversed.toId, name: reversed.toName }
        );
    };

    return (
        <div className={styles.page}>
            <AppHeader />
            <main className={styles.main}>
                {savedTrips.length > 0 && (
                    <section className={styles.section} aria-labelledby='saved-heading'>
                        <h2 className={styles.sectionHeading} id='saved-heading'>
                            Saved trips
                        </h2>
                        <ul className={styles.savedList}>
                            {savedTrips.map((trip) => (
                                <li className={styles.savedItem} key={trip.id}>
                                    <button
                                        type='button'
                                        className={styles.savedMain}
                                        onClick={() => openSaved(trip)}
                                    >
                                        <span className={styles.savedRoute}>
                                            {trip.fromName}
                                            <span aria-hidden='true' className={styles.savedArrow}>
                                                →
                                            </span>
                                            {trip.toName}
                                        </span>
                                        <span className={styles.savedHint}>Next departures</span>
                                    </button>
                                    <div className={styles.savedActions}>
                                        <button
                                            type='button'
                                            className={styles.savedAction}
                                            onClick={() => openSavedReversed(trip)}
                                            aria-label={`Plan the return trip from ${trip.toName} to ${trip.fromName}`}
                                        >
                                            <span aria-hidden='true'>⇄</span>
                                        </button>
                                        <button
                                            type='button'
                                            className={styles.savedAction}
                                            onClick={() => setSavedTrips(removeTrip(trip.id))}
                                            aria-label={`Remove saved trip from ${trip.fromName} to ${trip.toName}`}
                                        >
                                            <span aria-hidden='true'>×</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className={styles.section} aria-labelledby='plan-heading'>
                    <h2 className={styles.sectionHeading} id='plan-heading'>
                        {savedTrips.length > 0 ? 'Plan another trip' : 'Plan a trip'}
                    </h2>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.stops}>
                            <StopSearch
                                label='From'
                                value={fromText}
                                onSelect={(stop) => {
                                    setFrom(stop);
                                    setFromText(stop?.name ?? '');
                                    setFormError(null);
                                }}
                            />
                            <button
                                type='button'
                                className={styles.swap}
                                onClick={swap}
                                aria-label='Swap starting point and destination'
                            >
                                <span aria-hidden='true'>⇅</span>
                            </button>
                            <StopSearch
                                label='To'
                                value={toText}
                                onSelect={(stop) => {
                                    setTo(stop);
                                    setToText(stop?.name ?? '');
                                    setFormError(null);
                                }}
                            />
                        </div>

                        <div className={styles.timeRow}>
                            <label className={styles.switch}>
                                <input
                                    type='checkbox'
                                    checked={useSpecificTime}
                                    onChange={(event) => setUseSpecificTime(event.target.checked)}
                                />
                                Travel at a specific time
                            </label>

                            {useSpecificTime && (
                                <div className={styles.timeControls}>
                                    <div className={styles.segmented} role='group' aria-label='Depart or arrive'>
                                        <button
                                            type='button'
                                            className={depOrArr === 'dep' ? styles.segmentActive : styles.segment}
                                            onClick={() => setDepOrArr('dep')}
                                            aria-pressed={depOrArr === 'dep'}
                                        >
                                            Depart at
                                        </button>
                                        <button
                                            type='button'
                                            className={depOrArr === 'arr' ? styles.segmentActive : styles.segment}
                                            onClick={() => setDepOrArr('arr')}
                                            aria-pressed={depOrArr === 'arr'}
                                        >
                                            Arrive by
                                        </button>
                                    </div>
                                    <label className={styles.srOnly} htmlFor='when'>
                                        Date and time
                                    </label>
                                    <input
                                        className={styles.dateTime}
                                        id='when'
                                        type='datetime-local'
                                        value={when}
                                        onChange={(event) => setWhen(event.target.value)}
                                        step='60'
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            type='button'
                            className={styles.optionsToggle}
                            onClick={() => setShowOptions((current) => !current)}
                            aria-expanded={showOptions}
                        >
                            {showOptions ? 'Hide options' : 'Options'}
                        </button>

                        {showOptions && (
                            <ModeFilter
                                selected={modes}
                                onChange={(next) => persistPreferences(next, wheelchairOnly)}
                                wheelchairOnly={wheelchairOnly}
                                onWheelchairChange={(next) => persistPreferences(modes, next)}
                            />
                        )}

                        {formError && <Notice tone='error' title={formError} />}

                        <button type='submit' className={styles.submit}>
                            Find trips
                        </button>
                    </form>
                </section>
            </main>
            <Footer />
        </div>
    );
}
