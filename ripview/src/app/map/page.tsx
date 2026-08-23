'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent as ReactWheelEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import NetworkMap from '../../../public/map/Sydney_Trains_Network_Map.svg';
import { stationNameById } from '@/lib/stations';
import styles from './map.module.css';

/**
 * The SVG's own viewBox. Starting anywhere else mis-frames the first paint —
 * the previous implementation initialised to `0 0 800 800` against an
 * 743 x 815 drawing.
 */
const INITIAL_VIEW = { x: 0, y: 0, width: 743, height: 815 } as const;

/** Zoom bounds, as a multiple of the full-map view. */
const MIN_SCALE = 1;
const MAX_SCALE = 8;

interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Selection {
    id: string;
    name: string;
}

/**
 * The schematic network map, as a way to browse the network and start a trip.
 *
 * This is a secondary entry point: search and saved trips are the fast path for
 * a commuter, and the map covers only about 46% of train and metro stations
 * (177 of 382) because it is hand-drawn. Whole corridors are missing — the
 * Central Coast & Newcastle line, Hawkesbury River, Cowan, and the Bankstown
 * corridor — so the page says so rather than leaving people hunting for a
 * station that was never drawn.
 *
 * Station picking works off the ids embedded in the SVG: a node with id
 * `A200060` or `212110_A` carries a TSN once the non-digits are stripped. A
 * candidate is only accepted if that TSN resolves to a real station, which
 * conveniently rejects the drawing's structural ids (`Layer_1`, `lines`,
 * `transfers`).
 */
export default function MapPage() {
    const router = useRouter();
    const [view, setView] = useState<ViewBox>({ ...INITIAL_VIEW });
    // Selections live in state, not in `let` bindings at component scope. In the
    // previous version any re-render — pressing a zoom or pan button — reset
    // them to '' while the green highlight, written straight to the DOM,
    // survived: stations looked selected that the app no longer knew about.
    const [from, setFrom] = useState<Selection | null>(null);
    const [to, setTo] = useState<Selection | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    /** Active pointers, for drag panning and two-finger pinch zoom. */
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const panOrigin = useRef<{ x: number; y: number; view: ViewBox } | null>(null);
    const pinchOrigin = useRef<{ distance: number; view: ViewBox } | null>(null);
    /** Set when a gesture moves far enough to be a pan rather than a tap. */
    const didDrag = useRef(false);

    /** Clamps a view so it can neither invert nor wander off the drawing. */
    const clampView = useCallback((next: ViewBox): ViewBox => {
        const maxWidth = INITIAL_VIEW.width / MIN_SCALE;
        const minWidth = INITIAL_VIEW.width / MAX_SCALE;
        const width = Math.min(maxWidth, Math.max(minWidth, next.width));
        const height = width * (INITIAL_VIEW.height / INITIAL_VIEW.width);
        // Allow half a screen of overscroll so edge stations can be centred.
        const x = Math.min(
            INITIAL_VIEW.width - width / 2,
            Math.max(-width / 2, next.x)
        );
        const y = Math.min(
            INITIAL_VIEW.height - height / 2,
            Math.max(-height / 2, next.y)
        );
        return { x: x, y: y, width: width, height: height };
    }, []);

    /**
     * Zooms about a fixed point in drawing coordinates, so whatever is under
     * the cursor or pinch centre stays there. The old implementation only grew
     * the width and height, anchoring every zoom to the top-left corner and
     * walking the view off target.
     */
    const zoomAbout = useCallback(
        (factor: number, focus?: { x: number; y: number }) => {
            setView((current) => {
                const anchor = focus ?? {
                    x: current.x + current.width / 2,
                    y: current.y + current.height / 2,
                };
                const width = current.width * factor;
                const ratio = width / current.width;
                return clampView({
                    x: anchor.x - (anchor.x - current.x) * ratio,
                    y: anchor.y - (anchor.y - current.y) * ratio,
                    width: width,
                    height: current.height * ratio,
                });
            });
        },
        [clampView]
    );

    /** Converts a client point to drawing coordinates for the current view. */
    const toDrawingPoint = useCallback(
        (clientX: number, clientY: number, currentView: ViewBox) => {
            const bounds = containerRef.current?.getBoundingClientRect();
            if (!bounds || bounds.width === 0) {
                return { x: currentView.x, y: currentView.y };
            }
            return {
                x: currentView.x + ((clientX - bounds.left) / bounds.width) * currentView.width,
                y: currentView.y + ((clientY - bounds.top) / bounds.height) * currentView.height,
            };
        },
        []
    );

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        didDrag.current = false;
        if (pointers.current.size === 1) {
            panOrigin.current = { x: event.clientX, y: event.clientY, view: view };
            pinchOrigin.current = null;
        } else if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinchOrigin.current = { distance: distanceBetween(a, b), view: view };
            panOrigin.current = null;
        }
        // Keep receiving moves even if the pointer leaves the element.
        (event.target as Element).setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(event.pointerId)) {
            return;
        }
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        // Two fingers: pinch to zoom about the midpoint between them.
        if (pointers.current.size >= 2 && pinchOrigin.current) {
            const [a, b] = [...pointers.current.values()];
            const distance = distanceBetween(a, b);
            if (distance > 0) {
                const start = pinchOrigin.current;
                const scale = start.distance / distance;
                const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const anchor = toDrawingPoint(midpoint.x, midpoint.y, start.view);
                const width = start.view.width * scale;
                const ratio = width / start.view.width;
                setView(
                    clampView({
                        x: anchor.x - (anchor.x - start.view.x) * ratio,
                        y: anchor.y - (anchor.y - start.view.y) * ratio,
                        width: width,
                        height: start.view.height * ratio,
                    })
                );
                didDrag.current = true;
            }
            return;
        }

        // One finger or a held mouse button: drag to pan.
        const origin = panOrigin.current;
        if (!origin) {
            return;
        }
        const bounds = containerRef.current?.getBoundingClientRect();
        if (!bounds || bounds.width === 0) {
            return;
        }
        const dx = ((event.clientX - origin.x) / bounds.width) * origin.view.width;
        const dy = ((event.clientY - origin.y) / bounds.height) * origin.view.height;
        // A few pixels of movement is a shaky tap, not a drag.
        if (Math.abs(event.clientX - origin.x) > 4 || Math.abs(event.clientY - origin.y) > 4) {
            didDrag.current = true;
        }
        setView(
            clampView({
                x: origin.view.x - dx,
                y: origin.view.y - dy,
                width: origin.view.width,
                height: origin.view.height,
            })
        );
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) {
            pinchOrigin.current = null;
        }
        if (pointers.current.size === 0) {
            panOrigin.current = null;
        }
    };

    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const focus = toDrawingPoint(event.clientX, event.clientY, view);
        // Trackpad pinch arrives as a wheel event with ctrlKey set.
        zoomAbout(event.deltaY > 0 ? 1.12 : 0.89, focus);
    };

    const select = useCallback(
        (station: Selection) => {
            if (!from) {
                setFrom(station);
                return;
            }
            if (station.id === from.id) {
                // Tapping the origin again clears it, so a mistake is fixable.
                setFrom(null);
                return;
            }
            setTo(station);
            router.push(
                `/tripPlanning?from=${encodeURIComponent(from.id)}` +
                `&fromName=${encodeURIComponent(from.name)}` +
                `&to=${encodeURIComponent(station.id)}` +
                `&toName=${encodeURIComponent(station.name)}`
            );
        },
        [from, router]
    );

    const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        // A drag that ends over a station is panning, not picking.
        if (didDrag.current) {
            return;
        }
        const station = stationFromEvent(event.target as Element);
        if (station) {
            select(station);
        }
    };

    // Reflect the selection into the inlined SVG. Driving this from state — and
    // clearing every node each time — keeps what is highlighted and what is
    // selected from drifting apart.
    useEffect(() => {
        const svg = containerRef.current?.querySelector('svg');
        if (!svg) {
            return;
        }
        const selectedIds = new Set([from?.id, to?.id].filter(Boolean));
        for (const node of svg.querySelectorAll<SVGElement>('[id]')) {
            const tsn = tsnFromId(node.id);
            if (!tsn) {
                continue;
            }
            node.classList.toggle('ripviewSelected', selectedIds.has(tsn));
        }
    }, [from, to]);

    const hasSelection = from !== null || to !== null;

    return (
        <div className={styles.page}>
            <AppHeader title='Network map' backTo='/' />
            <main className={styles.main}>
                <div className={styles.controlBar}>
                    <p className={styles.instruction} role='status'>
                        {from
                            ? `From ${from.name} — now tap your destination`
                            : 'Tap a station to start planning a trip'}
                    </p>
                    <div className={styles.controls}>
                        <button
                            type='button'
                            className={styles.control}
                            onClick={() => zoomAbout(0.7)}
                            aria-label='Zoom in'
                        >
                            <span aria-hidden='true'>+</span>
                        </button>
                        <button
                            type='button'
                            className={styles.control}
                            onClick={() => zoomAbout(1.43)}
                            aria-label='Zoom out'
                        >
                            <span aria-hidden='true'>−</span>
                        </button>
                        <button
                            type='button'
                            className={styles.control}
                            onClick={() => {
                                setView({ ...INITIAL_VIEW });
                                setFrom(null);
                                setTo(null);
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {hasSelection && (
                    <button type='button' className={styles.clear} onClick={() => { setFrom(null); setTo(null); }}>
                        Clear selection
                    </button>
                )}

                <div
                    className={styles.mapViewport}
                    ref={containerRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onWheel={handleWheel}
                    onClick={handleClick}
                >
                    <NetworkMap
                        className={styles.map}
                        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
                    />
                </div>

                <p className={styles.coverageNote}>
                    This schematic map is hand-drawn and covers 177 of the network&rsquo;s 382 train
                    and metro stations. Some lines — including the Central Coast &amp; Newcastle line
                    and the Bankstown corridor — are not shown. Use{' '}
                    <Link href='/'>search</Link> to reach any stop on the network.
                </p>
            </main>
            <Footer />
        </div>
    );
}

/**
 * Extracts a TSN from an SVG node id.
 *
 * Station nodes are named `A200060` or `212110_A`, where the letter
 * disambiguates a station drawn more than once because it sits on several
 * lines. SVGR also prefixes every id when it inlines the file, so the id seen
 * at runtime is `Sydney_Trains_Network_Map_svg__A200060`.
 *
 * Matching a run of at least five digits — rather than stripping all
 * non-digits — is what makes this safe: were the prefix ever to contain a
 * digit, concatenating every run would silently produce a wrong TSN that still
 * looked plausible. Every station id in the drawing has a single 6- or 7-digit
 * run; the only shorter one belongs to `Layer_1`, which is not a station.
 */
function tsnFromId(id: string): string | null {
    return /\d{5,}/.exec(id)?.[0] ?? null;
}

/**
 * Walks up from a clicked element to the nearest ancestor whose id names a real
 * station. Requiring the TSN to resolve is what filters out the drawing's own
 * structural ids.
 */
function stationFromEvent(target: Element | null): Selection | null {
    let node: Element | null = target;
    while (node) {
        if (node.id) {
            const tsn = tsnFromId(node.id);
            const name = tsn ? stationNameById(tsn) : null;
            if (tsn && name) {
                return { id: tsn, name: name };
            }
        }
        node = node.parentElement;
    }
    return null;
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
