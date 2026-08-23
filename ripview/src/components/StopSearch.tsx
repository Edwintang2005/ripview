'use client';

import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
} from 'react';
import { searchStopsAction } from '@/app/actions/transport';
import { MIN_STOP_QUERY_LENGTH } from '@/lib/tfnsw/queries';
import { modeLabel } from '@/lib/modes';
import { searchStations } from '@/lib/stations';
import type { StopSuggestion } from '@/lib/types';
import styles from './StopSearch.module.css';

interface StopSearchProps {
    label: string;
    /** Current display name, so a parent can prefill or clear the field. */
    value: string;
    /**
     * Called when a stop is chosen, or with an empty id when the text is
     * edited away from a valid selection.
     */
    onSelect: (stop: { id: string; name: string } | null) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

/** Milliseconds of quiet before searching, so we don't query per keystroke. */
const DEBOUNCE_MS = 220;

/**
 * A stop search box with live results from TfNSW.
 *
 * Implements the ARIA combobox pattern properly, which the previous
 * `StationSelect` did not: it had no `role`, no `aria-expanded`, no
 * `aria-activedescendant`, click-only `<li>` options and no arrow-key
 * navigation, which made it unusable by keyboard or screen reader. It also
 * rendered all 382 stations unvirtualised whenever the field was empty.
 *
 * Results come from `/stop_finder`, so every stop, wharf and interchange on the
 * network is reachable — not just the train and metro stations in the bundled
 * snapshot. If that request fails, the bundled list is used instead so the app
 * still works offline, with a note explaining the reduced coverage.
 */
export default function StopSearch({
    label,
    value,
    onSelect,
    placeholder = 'Station, stop or address',
    autoFocus = false,
}: StopSearchProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<StopSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const [usedFallback, setUsedFallback] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    // Identifies the most recent request so a slow earlier one cannot overwrite
    // the results of a later, more relevant query.
    const requestRef = useRef(0);

    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const inputId = `${baseId}-input`;

    // Let the parent drive the displayed text, e.g. when swapping from and to.
    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length === 0) {
            setSuggestions([]);
            setIsSearching(false);
            setUsedFallback(false);
            return;
        }

        // Below the live search's minimum, the bundled list still helps.
        if (trimmed.length < MIN_STOP_QUERY_LENGTH) {
            setSuggestions(searchStations(trimmed));
            setIsSearching(false);
            setUsedFallback(false);
            return;
        }

        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setIsSearching(true);

        const timer = setTimeout(async () => {
            const result = await searchStopsAction(trimmed);
            // A newer query has been issued; discard this stale answer.
            if (requestRef.current !== requestId) {
                return;
            }
            if (result.ok && result.data.length > 0) {
                setSuggestions(result.data);
                setUsedFallback(false);
            } else {
                // Either the request failed or TfNSW knows nothing. Offer what
                // we have bundled rather than an empty list.
                const local = searchStations(trimmed);
                setSuggestions(local);
                setUsedFallback(!result.ok && local.length > 0);
            }
            setIsSearching(false);
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query]);

    // Close when focus or a click leaves the component.
    useEffect(() => {
        function handlePointerDown(event: MouseEvent | TouchEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        }
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, []);

    const choose = useCallback(
        (suggestion: StopSuggestion) => {
            setQuery(suggestion.name);
            setIsOpen(false);
            setActiveIndex(-1);
            onSelect({ id: suggestion.id, name: suggestion.name });
        },
        [onSelect]
    );

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
        setIsOpen(true);
        setActiveIndex(-1);
        // Typing invalidates any previous selection: the id no longer matches
        // what is on screen, and submitting a stale id would plan the wrong trip.
        onSelect(null);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            setActiveIndex(-1);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (suggestions.length === 0) {
                return;
            }
            setIsOpen(true);
            setActiveIndex((current) => {
                const step = event.key === 'ArrowDown' ? 1 : -1;
                const next = current + step;
                if (next < 0) {
                    return suggestions.length - 1;
                }
                if (next >= suggestions.length) {
                    return 0;
                }
                return next;
            });
            return;
        }
        if (event.key === 'Home' && isOpen && suggestions.length > 0) {
            event.preventDefault();
            setActiveIndex(0);
            return;
        }
        if (event.key === 'End' && isOpen && suggestions.length > 0) {
            event.preventDefault();
            setActiveIndex(suggestions.length - 1);
            return;
        }
        if (event.key === 'Enter') {
            // Only intercept Enter when a suggestion is highlighted, so the
            // form can still be submitted from the field otherwise.
            if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
                event.preventDefault();
                choose(suggestions[activeIndex]);
            }
            return;
        }
        if (event.key === 'Tab' && isOpen && suggestions.length > 0) {
            // Tab accepts the highlighted option, or the first if none is.
            const target = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
            choose(target);
        }
    };

    // Keep the highlighted option in view during keyboard navigation.
    useEffect(() => {
        if (activeIndex < 0 || !listRef.current) {
            return;
        }
        const option = listRef.current.children[activeIndex] as HTMLElement | undefined;
        option?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const showList = isOpen && (suggestions.length > 0 || (isSearching && query.trim().length > 0));

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <label className={styles.label} htmlFor={inputId}>
                {label}
            </label>
            <div className={styles.field}>
                <input
                    id={inputId}
                    className={styles.input}
                    type='text'
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    autoComplete='off'
                    autoCorrect='off'
                    spellCheck={false}
                    autoFocus={autoFocus}
                    role='combobox'
                    aria-expanded={showList}
                    aria-controls={listboxId}
                    aria-autocomplete='list'
                    aria-activedescendant={
                        activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
                    }
                />
                {query.length > 0 && (
                    <button
                        type='button'
                        className={styles.clear}
                        onClick={() => {
                            setQuery('');
                            setSuggestions([]);
                            onSelect(null);
                            setIsOpen(false);
                        }}
                        aria-label={`Clear ${label.toLowerCase()}`}
                    >
                        ×
                    </button>
                )}
            </div>

            {showList && (
                <ul className={styles.listbox} id={listboxId} role='listbox' ref={listRef}>
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={`${suggestion.id}-${index}`}
                            id={`${listboxId}-option-${index}`}
                            className={`${styles.option} ${
                                index === activeIndex ? styles.optionActive : ''
                            }`}
                            role='option'
                            aria-selected={index === activeIndex}
                            // A pointer down would blur the input and close the
                            // list before the click landed.
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => choose(suggestion)}
                        >
                            <span className={styles.optionName}>{suggestion.name}</span>
                            <span className={styles.optionMeta}>
                                {suggestion.locality && (
                                    <span className={styles.locality}>{suggestion.locality}</span>
                                )}
                                {suggestion.modes.map((mode) => (
                                    <span key={mode} className={styles.modeChip}>
                                        {modeLabel(mode)}
                                    </span>
                                ))}
                            </span>
                        </li>
                    ))}
                    {suggestions.length === 0 && isSearching && (
                        <li className={styles.hint}>Searching…</li>
                    )}
                </ul>
            )}

            {/* Announced politely so it never interrupts typing. */}
            <span className={styles.srOnly} role='status' aria-live='polite'>
                {showList ? `${suggestions.length} results available` : ''}
            </span>

            {usedFallback && (
                <p className={styles.fallbackNote}>
                    Showing bundled stations only — live search is unavailable.
                </p>
            )}
        </div>
    );
}
