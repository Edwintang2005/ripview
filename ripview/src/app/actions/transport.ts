'use server';

/**
 * Server actions — the only entry points the browser can call.
 *
 * These are deliberately thin. The API key is read inside
 * `src/lib/tfnsw/client.ts`, which runs only here, so nothing secret is ever
 * inlined into a client bundle.
 */

import {
    fetchDepartures,
    fetchJourneys,
    fetchStopSuggestions,
    type DepartureQuery,
    type TripQuery,
} from '@/lib/tfnsw/queries';
import type { Departure, Journey, Result, StopSuggestion } from '@/lib/types';

export async function planTripAction(query: TripQuery): Promise<Result<Journey[]>> {
    return fetchJourneys(query);
}

export async function departuresAction(query: DepartureQuery): Promise<Result<Departure[]>> {
    return fetchDepartures(query);
}

export async function searchStopsAction(query: string): Promise<Result<StopSuggestion[]>> {
    return fetchStopSuggestions(query);
}
