/**
 * The TfNSW HTTP client. Server-side only.
 *
 * This replaces the Swagger-generated `typescript-fetch-client` on the request
 * path. It exists because the generated client:
 *
 *  - models `product.class` as `product._class`, so mode detection silently
 *    read `undefined` on every leg (see `./responses.ts`);
 *  - takes 29 positional parameters for a trip request;
 *  - logs the full request URL on every call;
 *  - throws the raw `Response` object on any non-2xx status, so callers cannot
 *    tell a rate limit from a bad API key without re-parsing it;
 *  - pulls in the `portable-fetch` and `es6-promise` shims for a runtime that
 *    has had native `fetch` for years.
 *
 * Every function here returns a `Result` rather than throwing, so a failure
 * reaches the UI as a message instead of an unhandled rejection.
 */

import type { Result, RipViewError } from '../types';

const BASE_URL = 'https://api.transport.nsw.gov.au/v1/tp';

/** Matches the OpenAPI spec version the endpoints were verified against. */
const API_VERSION = '10.2.1.42';

/** Guards against the whole module being pulled into a client bundle. */
function assertServer(): void {
    if (typeof window !== 'undefined') {
        throw new Error(
            'src/lib/tfnsw/client.ts must never run in the browser: it reads the ' +
            'TfNSW API key. Call it from a server action instead.'
        );
    }
}

function readApiKey(): string | null {
    const key = process.env.TPNSWAPIKEY?.trim();
    if (!key) {
        return null;
    }
    // The key is stored complete with its `apikey ` scheme prefix, because that
    // whole string is the Authorization header value. Tolerate a bare key too.
    return /^apikey\s/i.test(key) ? key : `apikey ${key}`;
}

function error(kind: RipViewError['kind'], message: string): { ok: false; error: RipViewError } {
    return { ok: false, error: { kind, message } };
}

/**
 * Performs a GET against a TfNSW endpoint.
 *
 * `params` values that are `undefined` are dropped, so callers can pass
 * optional parameters inline without building the object conditionally.
 */
export async function tfnswGet<T>(
    endpoint: 'trip' | 'departure_mon' | 'stop_finder' | 'add_info' | 'coord',
    params: Record<string, string | number | undefined>
): Promise<Result<T>> {
    assertServer();

    const apiKey = readApiKey();
    if (!apiKey) {
        return error(
            'auth',
            'No Transport for NSW API key is configured. Set TPNSWAPIKEY in ripview/.env — see the README.'
        );
    }

    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.set('outputFormat', 'rapidJSON');
    url.searchParams.set('coordOutputFormat', 'EPSG:4326');
    url.searchParams.set('version', API_VERSION);
    for (const [name, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(name, String(value));
        }
    }

    let response: Response;
    try {
        response = await fetch(url, {
            headers: { Authorization: apiKey, Accept: 'application/json' },
            // Timetable and real-time data must never be served from a cache.
            cache: 'no-store',
            signal: AbortSignal.timeout(15_000),
        });
    } catch (cause) {
        const isTimeout = cause instanceof Error && cause.name === 'TimeoutError';
        return error(
            'network',
            isTimeout
                ? 'Transport for NSW took too long to respond. Please try again.'
                : 'Could not reach Transport for NSW. Check your connection and try again.'
        );
    }

    if (response.status === 401 || response.status === 403) {
        return error(
            'auth',
            'Transport for NSW rejected the API key. Check TPNSWAPIKEY and that your key has the Trip Planner API enabled.'
        );
    }
    if (response.status === 429) {
        return error(
            'rateLimit',
            'Too many requests to Transport for NSW. Please wait a moment and try again.'
        );
    }
    if (!response.ok) {
        return error(
            'unknown',
            `Transport for NSW returned an error (${response.status}). Please try again.`
        );
    }

    try {
        return { ok: true, data: (await response.json()) as T };
    } catch {
        return error('unknown', 'Transport for NSW returned a response that could not be read.');
    }
}
