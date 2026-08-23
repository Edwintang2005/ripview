# ripview

A recreation of the popular TripView transport app, built on a Next.js stack over the Transport for NSW (TfNSW) Open Data APIs.

RipView is a **web app first**: it is served over HTTPS, works in any modern browser, and is intended to be installed to the home screen ("Add to Home Screen" / "Install app") so it behaves like a native app on mobile. There is no separate iOS/Android codebase — cross-platform support comes from being a well-behaved responsive web app.

---

## Table of contents

- [Project status](#project-status)
- [Architecture](#architecture)
  - [Directory layout](#directory-layout)
  - [Routes](#routes)
  - [Data flow](#data-flow)
- [The Transport for NSW APIs](#the-transport-for-nsw-apis)
  - [Endpoints available](#endpoints-available)
  - [Which endpoints RipView uses today](#which-endpoints-ripview-uses-today)
  - [Stop identifiers](#stop-identifiers)
  - [Real-time data](#real-time-data)
  - [Fares](#fares)
  - [Date and time parameters](#date-and-time-parameters)
  - [The generated API client](#the-generated-api-client)
- [Station reference data](#station-reference-data)
- [The SVG network map](#the-svg-network-map)
- [Setting up the TfNSW API key](#setting-up-the-tfnsw-api-key)
- [Development workflows](#development-workflows)
- [Deployment and PWA notes](#deployment-and-pwa-notes)
- [Known issues](#known-issues)
- [Roadmap](#roadmap)
- [Contributors](#contributors)
- [Sources and documentation used](#sources-and-documentation-used)

---

## Project status

**Prototype / paused.** The core loop works end to end — pick two stations, get a list of journey options from the live TfNSW trip planner — but the project is not production-ready. Before anything else:

| | Status |
|---|---|
| `npm run dev` | ✅ works |
| `npm run build` | ❌ **fails** — 4 lint errors are treated as build errors (see [Known issues](#known-issues)) |
| `npm run lint` | ❌ 4 errors, 2 warnings |
| `npm test` | ❌ exits 1 — Jest is configured but **there are no test files** |
| TfNSW API connectivity | ✅ verified working (`/trip`, `/departure_mon`, `/add_info` all return HTTP 200 with live data) |
| Installable PWA | ⚠️ partial — manifest is incomplete and there is no service worker |

The APIs themselves are **not** the blocker. They were re-verified against production and behave as documented. The fragility is in RipView's own layer between the API and the UI — see [Known issues](#known-issues).

---

## Architecture

Next.js 15 (App Router) + React 19 + TypeScript (`strict`) + CSS Modules. No state-management or data-fetching library; no database; no backend of its own. All dynamic data comes from TfNSW at request time, and all station reference data is a static file vendored into the repo.

### Directory layout

```
ripview/                            # the Next.js app (note: repo root contains this subdirectory)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout: fonts, viewport, manifest link, Font Awesome CDN
│   │   ├── page.tsx                # "/"            – trip planning form
│   │   ├── globals.css             # CSS custom properties + light/dark colour scheme
│   │   ├── api/
│   │   │   └── apiCalls.tsx        # 'use server' — the ONLY place the API key is used
│   │   ├── data/
│   │   │   ├── stationsInformation.json   # vendored station snapshot (297 KB) — imported by the app
│   │   │   └── stationsInformation.csv    # same data as CSV (283 KB) — currently unused
│   │   ├── mapInput/               # "/mapInput"    – clickable SVG network map
│   │   └── tripPlanning/           # "/tripPlanning" – journey results
│   ├── components/                 # Header, Footer, StationSelect, BackButton, ScrollToTop, ...
│   ├── config/
│   │   └── trainLineColours.ts     # line name → brand colour (currently unused, keys are stale)
│   └── utils/
│       ├── getData.ts              # station lookup helpers over the vendored JSON
│       └── navigation.ts           # PAGE_PATHS route constants (partially unused)
├── public/
│   ├── map/Sydney_Trains_Network_Map.svg   # hand-authored schematic map, station ids embedded
│   ├── favicon/                    # icons + a second, unused webmanifest
│   └── site.webmanifest            # the manifest actually linked from layout.tsx
├── typescript-fetch-client/        # Swagger-codegen 2.4.43 client for TfNSW Trip Planner v10.2.1.42
├── next.config.ts                  # SVGR webpack rule + env passthrough
├── eslint.config.mjs               # large hand-tuned ruleset (4-space indent, single quotes, semicolons)
└── jest.config.ts                  # configured, but no tests exist yet
```

### Routes

| Route | File | Rendering | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Client | From/To station autocomplete, "current time" vs "specific time", depart-at / arrive-by. Submits a `GET` form to `/tripPlanning`. |
| `/tripPlanning` | `src/app/tripPlanning/page.tsx` | Client | Reads the query string, calls the `FetchtripData` server action, renders journey options. |
| `/mapInput` | `src/app/mapInput/page.tsx` | Client | Renders the schematic SVG. First station tapped becomes origin, second becomes destination, then redirects to `/tripPlanning`. |

There is no `/about` or `/settings` yet, though `PAGE_PATHS` in `src/utils/navigation.ts` reserves them.

### Data flow

```
                        ┌──────────────────────────────────────┐
  station list ────────►│  "/"  form   OR   "/mapInput" SVG    │
  (static JSON,         │  produces: fromStations, toStations,  │
   bundled)             │  timePreference, depOrArr, time       │
                        └───────────────────┬──────────────────┘
                                            │ GET query string
                                            ▼
                        ┌──────────────────────────────────────┐
                        │  "/tripPlanning" (client component)  │
                        └───────────────────┬──────────────────┘
                                            │ server action: FetchtripData()
                                            ▼
                        ┌──────────────────────────────────────┐
                        │  src/app/api/apiCalls.tsx            │
                        │  'use server' — holds TPNSWAPIKEY    │
                        │  planTrip() → typescript-fetch-client│
                        └───────────────────┬──────────────────┘
                                            │ HTTPS GET, Authorization header
                                            ▼
                          api.transport.nsw.gov.au/v1/tp/trip
                                            │
                                            ▼
                        ┌──────────────────────────────────────┐
                        │  tripResponseToJson()                │
                        │  ⚠️ flattens the typed response into  │
                        │     string[][] display strings       │
                        └──────────────────────────────────────┘
```

The API key never reaches the browser: `apiCalls.tsx` is marked `'use server'`, so `FetchtripData` is invoked as a React Server Action and the outbound HTTPS request is made from the server. See [Known issues](#known-issues) for why the `next.config.ts` `env` block makes this more fragile than it needs to be.

---

## The Transport for NSW APIs

Base URL: `https://api.transport.nsw.gov.au/v1/tp`
Auth: `Authorization: apikey <YOUR_KEY>` request header.
Reference: *Trip Planning APIs: Technical Documentation*, TfNSW, v3.3 (April 2022), plus the [Open Data Swagger docs](https://opendata.transport.nsw.gov.au/).

### Endpoints available

| Endpoint | Also called | What it gives you | Response model in the client |
|---|---|---|---|
| `/trip` | Trip Planner | Full journey options between two points, including walking/driving legs, per-leg stopping patterns, real-time estimates and Opal fares. | `TripRequestResponse` |
| `/departure_mon` | Departure API | Upcoming departures from one stop — the "departure board" / "next trains" view. | `DepartureMonitorResponse` |
| `/stop_finder` | Stop Finder | Autocomplete over stops, stations, wharves, POIs and addresses. Also looks a stop up by id. | `StopFinderResponse` |
| `/add_info` | Service Alert API | Service status, incidents, trackwork, delays. Filterable by date, mode and stop. | `AdditionalInfoResponse` |
| `/coord` | Coordinate Request | Stops / POIs / Opal resellers near a lat-lon. | `CoordRequestResponse` |

All five are already present in the generated client (`typescript-fetch-client/api.ts`).

### Which endpoints RipView uses today

Only **`/trip`**, via `planTrip()` in `src/app/api/apiCalls.tsx`. The other four are untouched, which is why RipView currently cannot show a departure board, live disruptions, or search for anything that isn't a train or metro station in the vendored file.

The call RipView makes:

```
GET /v1/tp/trip
  ?outputFormat=rapidJSON
  &coordOutputFormat=EPSG:4326
  &depArrMacro=dep|arr
  &type_origin=any&name_origin=<TSN>
  &type_destination=any&name_destination=<TSN>
  &itdDate=YYYYMMDD
  &itdTime=HHMM
  &calcNumberOfTrips=10
  &excludedMeans=checkbox
  &exclMOT_4=1&exclMOT_5=1&exclMOT_7=1&exclMOT_9=1&exclMOT_11=1
  &TfNSWTR=true
```

The `exclMOT_*` flags exclude light rail, bus, coach, ferry and school bus, leaving **train and metro only** — which is why RipView cannot currently plan a trip involving any other mode. `TfNSWTR=true` is what enables real-time.

The mode codes, from `transportation.product.class` (and the matching `exclMOT_<n>` parameters):

| Class | Mode | Excluded by RipView today? |
|---|---|---|
| 1 | Train | no |
| 2 | Metro | no |
| 4 | Light rail | yes |
| 5 | Bus | yes |
| 7 | Coach | yes |
| 9 | Ferry | yes |
| 11 | School bus | yes |
| 99, 100 | Walk | n/a (always returned) |
| 107 | Cycle | n/a |

Class 2 (Metro) is not listed in the v3.3 documentation but is returned in production — e.g. `Sydney Metro Network M1 Metro North West & Bankstown Line` at Central.

### Stop identifiers

TfNSW has two id schemes and this trips people up:

- **TSN** (Transport Stop Number) — e.g. `200060` for Central Station. This is the `TSN` column in the station dataset and what RipView passes as `name_origin` / `name_destination`.
- **Global stop id / EFA id** — e.g. `10101100` for Central. This is the `EFA_ID` column, and it is what the TfNSW documentation's examples use.

**Both work.** Verified against production: `/trip` with `name_origin=200060` and `name_origin=10101100` return identical journeys. There is no need to migrate the app to global ids.

Two consequences worth knowing:

- TSNs are *parent* stops. `200060` means "Central Station" as a whole, not a specific platform. Platform-level ids exist (returned in leg `origin.id` / `destination.id`) and are needed for a per-platform departure board.
- `type_origin=any` lets the API resolve free text too, so `/stop_finder` can replace the vendored station file entirely if you want live autocomplete across all modes.

### Real-time data

With `TfNSWTR=true`, each leg stop carries **both** a scheduled and an estimated time:

| Field | Meaning |
|---|---|
| `departureTimePlanned` / `arrivalTimePlanned` | The timetable. Always present. |
| `departureTimeEstimated` / `arrivalTimeEstimated` | The live estimate. Present only when real-time is available for that service. |

The rule from the TfNSW docs: if the estimated field is present and parses to a valid timestamp, use it and label the time as live; otherwise fall back to the planned time. The difference between the two is the delay you display.

Each non-walking leg also has a `stopSequence` array — the ordered list of stops the vehicle calls at, first element equal to the leg's `origin` and last equal to its `destination`, with platform names included (`"Central Station, Platform 21"`). This is what you need for an expandable "all stops" view.

**RipView currently reads only `departureTimePlanned` and `arrivalTimePlanned`**, so despite passing `TfNSWTR=true` it displays a pure timetable and never shows a delay. Verified: the API *is* returning `departureTimeEstimated` for these requests.

### Fares

`journeys[n].fare.tickets` carries Opal fares when available. Each ticket has a `person` (`ADULT`, `CHILD`, …) and `properties`. The one ticket whose `properties` contains `evaluationTicket` is the whole-journey total; the rest are per-leg. `evaluationTicket` tells you how much to trust the total:

| Value | Meaning |
|---|---|
| `nswFareEnabled` | Every priced leg is a TfNSW service — the total is the real cost. |
| `nswFarePartiallyEnabled` | Some legs (e.g. a private ferry) can't be priced — the total is a partial. |
| `nswFareNotAvailable` | No leg has a calculable fare. |

RipView does not request or display fares.

### Date and time parameters

- `itdDate` — `YYYYMMDD`
- `itdTime` — `HHMM`, 24-hour, no colon
- Times come back as UTC ISO 8601 (`2026-08-22T23:56:00Z`) and must be rendered in `Australia/Sydney`. `Intl.DateTimeFormat` with `timeZone: 'Australia/Sydney'` handles AEST/AEDT correctly — do not hardcode an offset.

`depArrMacro=arr` ("arrive by") returns journeys arriving no later than the given time, **sorted latest-arrival-first**. `depArrMacro=dep` returns journeys departing no earlier than the time, earliest first. The API already applies the constraint, so client-side re-filtering of arrive-by results should not be necessary.

### The generated API client

`typescript-fetch-client/` was produced by Swagger Codegen 2.4.43 from the TfNSW OpenAPI spec (version `10.2.1.42`). It is checked in and should be treated as generated — the `.swagger-codegen-ignore` file is there for that reason.

It provides 50 typed response interfaces, including the full `TripRequestResponseJourneyLeg` shape (`stopSequence`, `transportation`, `origin`, `destination`, `coords`, `interchange`, `infos`, `duration`, `distance`). **These types already model everything the app is currently throwing away.**

Caveats:
- It imports Node's `url` module and the `portable-fetch` polyfill, so it is **server-side only** as generated. That is fine while all calls go through server actions.
- `DefaultApiFp.tfnswTripRequest2` contains a `console.log` of the request URL, which will log the full query string server-side on every request.
- Method signatures are long positional parameter lists (29 parameters for `tfnswTripRequest2`). Wrapping each call in a small named-argument function is worth doing.

---

## Station reference data

`src/app/data/stationsInformation.json` is a snapshot of the TfNSW [Public Transport Location Facilities and Operators](https://opendata.transport.nsw.gov.au/data/dataset/public-transport-location-facilities-and-operators/resource/e9d94351-f22d-46ea-b64d-10e7e238368a) dataset, captured **January 2025**. `stationsInformation.csv` is the same data in CSV form and is not read by any code.

Shape: `{ fields: [...], records: [[...], ...] }` — records are **positional arrays**, and the app indexes them by number:

| Index | Field | Used as |
|---|---|---|
| 0 | `_id` | — |
| 1 | `LOCATION_NAME` | display name |
| 2 | `TSN` | the stop id sent to the API |
| 3 | `LATITUDE` | — (needed for a geographic map) |
| 4 | `LONGITUDE` | — (needed for a geographic map) |
| 5 | `EFA_ID` | — (global stop id) |
| 6–9 | `PHONE`, `ADDRESS`, `FACILITIES`, `ACCESSIBILITY` | — |
| 10 | `TRANSPORT_MODE` | filtered with `/Train|Metro/` |
| 11–13 | `MORNING_PEAK`, `AFTERNOON_PEAK`, `SHORT_PLATFORM` | — |

`getStationIdEntries()` filters to `Train|Metro`, leaving **382 stations** out of 775 rows.

Two things to be aware of:

1. **The whole 297 KB file is imported into a client component** (`getData.ts` → `page.tsx`), so it ships to the browser on first load, including phone numbers, addresses and facility text the UI never uses.
2. **It is a frozen snapshot.** The dataset only publishes 5 API calls per day on its Data API, which is presumably why it was vendored — but nothing refreshes it, so station openings, closures and mode changes drift out of date silently. `/stop_finder` is the live alternative.

---

## The SVG network map

`public/map/Sydney_Trains_Network_Map.svg` is a hand-authored schematic map (743 × 815 viewBox, ~1,755 lines) imported as a React component via [SVGR](https://react-svgr.com/) (configured in `next.config.ts`, typed in `svgr.d.ts`).

**How station picking works.** Each station node carries an `id` of the form `<letter><TSN>` or `<TSN>_<letter>` — for example `A200060` is Central Station (TSN `200060`), and `212110_A` is Epping. The letter prefix/suffix disambiguates a station that is drawn more than once because it sits on multiple lines. `handleSVGClick` walks up from the click target to the first ancestor with an `id`, strips every non-digit to recover the TSN, then paints the node green and stores it as origin or destination.

**Coverage.** This is the thing to know before deciding whether to keep it:

| | Count |
|---|---|
| `id` attributes in the SVG | 312 |
| Distinct station TSNs | **177** |
| Train/metro stations in the dataset | **382** |
| Coverage | **~46%** |

Entire corridors have no node on the map, including the Central Coast & Newcastle line (Gosford, Woy Woy, Ourimbah, Wondabyne, Point Clare, Tascott, Narara, Lisarow, Niagara Park, Koolewong), Hawkesbury River, Cowan, and the Bankstown corridor (Canterbury, Campsie, Belmore, Lakemba, Wiley Park, Punchbowl, Hurlstone Park, Marrickville, Dulwich Hill). Every id that *is* present resolves to a real TSN in the dataset, so what exists is correct — it is just incomplete, and extending it means more hand-editing.

**Interaction.** Pan and zoom are driven by on-screen buttons that mutate the `viewBox` string in React state (`zoom(±0.4)`, and `left`/`right`/`up`/`down(15)`). There is no pinch-zoom and no drag-to-pan — the `onDragStart` handler only logs. `userScalable: false` in the layout's viewport also disables the browser's own pinch-zoom, so on a phone the buttons are the only way to navigate. Zoom only grows the viewBox width/height and never adjusts x/y, so it is anchored to the top-left corner rather than the centre, and the initial state is `'0 0 800 800'` while the SVG's own viewBox is `0 0 743 815`, so the first paint is slightly mis-framed.

See [Roadmap](#roadmap) for the alternatives.

---

## Setting up the TfNSW API key

The API key used to query TfNSW servers is private, so it is not in the repo. Create your own key by following the [TfNSW Open Data user guide](https://opendata.transport.nsw.gov.au/developers/userguide) — you need an account, then an application with the **Trip Planner** API added to it.

`ripview/env.dist` is the template for the `.env` file you will create. It contains:

```bash
TPNSWAPIKEY="apikey {yourKeyHere}"
```

Replace `{yourKeyHere}` with your key, keeping the `apikey ` prefix and the quotes — the whole string is sent verbatim as the `Authorization` header. If your key were `hello`, the file would read:

```bash
TPNSWAPIKEY="apikey hello"
```

Then rename the file so Next.js picks it up:

```bash
cd ripview && mv env.dist .env
```

`.env*` is gitignored, so your key will not be committed.

---

## Development workflows

All commands run from the `ripview/` subdirectory, not the repository root.

**Install dependencies** (first time only):

```bash
cd ripview && npm install
```

**Start the dev server** on http://localhost:3000:

```bash
cd ripview && npm run dev
```

**Production build.** This currently fails — Next.js runs ESLint as part of `next build` and the repo has 4 lint errors:

```bash
cd ripview && npm run build
```

**Lint.** Uses `eslint` via `next lint` with the large hand-tuned config in `eslint.config.mjs`. House style is 4-space indent, single quotes, mandatory semicolons, no trailing whitespace, `===` over `==`:

```bash
cd ripview && npm run lint
```

**Typecheck** without building:

```bash
cd ripview && npx tsc --noEmit
```

**Tests.** Jest 29 with `jsdom` and Testing Library are installed and `jest.config.ts` exists, but no test files have been written, so this exits non-zero:

```bash
cd ripview && npm test
```

Note that `jest.config.ts` does not wire up `next/jest`, so TS/JSX transformation, CSS-module stubbing and `@/*` path aliases are not configured yet — that has to be added before the first component test will run.

---

## Deployment and PWA notes

RipView is a standard Next.js app and deploys to any Node host or to Vercel with no extra configuration. `TPNSWAPIKEY` must be set as a server environment variable in the hosting platform.

For the "save to home screen" experience to work properly, three things are needed and only partly present today:

1. **A complete web app manifest.** `public/site.webmanifest` is the one linked from `layout.tsx`. It sets `display: standalone` and `short_name`, but is missing `name`, `start_url`, `scope`, `theme_color`, `background_color`, icon `type`s and a `maskable` icon. A second, stale manifest sits at `public/favicon/site.webmanifest` still saying `"MyWebSite"` and pointing at paths that do not resolve; it is unreferenced and should be deleted.
2. **A service worker.** There is none, so RipView has no offline capability, no asset caching, and Android will not offer an install prompt. A service worker that pre-caches the shell and the station list, and serves a cached timetable when the network is unavailable, is the single highest-value addition for mobile.
3. **iOS specifics.** `apple-mobile-web-app-status-bar-style: black-translucent` and `viewport-fit: cover` are already set. The layout uses `@media (display-mode: standalone)` to add top padding for the notch — a workable approach, though `env(safe-area-inset-top)` is the more robust one.

Also note that `layout.tsx` loads Font Awesome from `cdnjs.cloudflare.com` for a handful of arrow icons. That is a render-blocking third-party request that cannot work offline; inlining those few icons as SVG would remove the dependency.

---

## Known issues

Ordered roughly by how much they hurt.

### Blocking

1. **`npm run build` fails.** Four ESLint errors are promoted to build errors: trailing whitespace in `mapInput/page.tsx:92` and `tripPlanning/page.tsx:217`, an undefined `NodeJS` global in `ScrollToTop.tsx:11`, and `==` instead of `===` in `getData.ts:14`. Until these are fixed the app cannot be deployed.

2. **No tests exist.** For an app whose whole value is correct times, there is no test asserting that a known API response renders the right departure.

### Correctness

3. **Journeys are modelled as `string[][]`.** `tripResponseToJson` converts the typed `TripRequestResponse` into arrays of pre-formatted display strings like `"From: Central Station, Platform 18. Departing at: 22/08/2026, 09:56:00"`. `tripPlanning/page.tsx` then **re-parses those strings** with `split('Departing at:')`, `split(', ')` and regex to recover the data it needs. This is the root cause of the app feeling unreliable: it is locale-dependent (an `en-AU` format string is parsed by position), it breaks on the `'Unknown time'` fallback, and the arrive-by filter `return false`s — silently dropping the journey — whenever a line doesn't match the expected shape. It also discards real-time estimates, fares, `stopSequence`, platform ids, leg mode and service alerts, all of which the generated types already model. **Replacing this with typed domain objects is the most valuable single change in the codebase.**

4. **Client-side arrive-by filtering is redundant and lossy.** `depArrMacro=arr` already guarantees journeys arrive no later than the requested time. The extra filter in `tripPlanning/page.tsx` re-derives arrival times from formatted strings and can empty out a perfectly good result set.

5. **Map selection state is lost on any re-render.** `mapInput/page.tsx` holds `fromId` and `toId` as plain `let` bindings at component scope and mutates them inside `useCallback`. Any state update — i.e. pressing any zoom or pan button — resets both to `''`. The green highlight is written directly to the DOM, so it *survives*, leaving stations that look selected but are not. There is also no way to deselect a mistake short of reloading. (ESLint already warns about this at `mapInput/page.tsx:79` and `:83`.)

6. **`getStationNameFromId` throws on an unknown id.** `records.filter(...)[0][1]` indexes into `undefined` when nothing matches, so a bad or missing `fromStations` query parameter takes down `/tripPlanning` with a `TypeError` rather than showing a message.

7. **No error or empty states.** `FetchtripData` is not wrapped in `try`/`catch`. A 401 (bad key), 429 (rate limit), network failure or `journeys: null` surfaces as a stuck `"Loading..."` or the sentinel string `'ERROR'` rendered as a trip option.

8. **`trainLineColours.ts` keys can never match.** The config keys on full line names like `'T1 North Shores & Western Line'`, but the live API returns `'Sydney Trains Network T1 North Shore & Western Line'` — "Shore", not "Shores", with a network prefix. `'T2 Inner West & Leppington Line'` is likewise `'T2 Leppington & Inner West Line'` upstream. The file is currently unused, which is the only reason this isn't visible. Colours should be keyed off `transportation.product.class` plus the line number (`disassembledName`), not the display string.

### Security and configuration

9. **`next.config.ts` `env` block is a foot-gun.** `env: { TPNSWAPIKEY }` inlines the value into any bundle that references `process.env.TPNSWAPIKEY`. Today only the `'use server'` module references it so nothing leaks — but a single stray reference in a client component would silently publish the key in the JS bundle. Next.js already reads `.env` server-side without this block; deleting it removes the hazard.

10. **The generated client logs the full request URL** (`api.ts`, in `DefaultApiFp.tfnswTripRequest2`). The API key is in a header, not the URL, so the key itself is not logged, but this is noise on every request and should go.

### Performance and UX

11. **The 297 KB station dataset ships to the browser** because `getData.ts` is imported by a client component. Only name and TSN are ever used. Projecting it to `{ name, tsn }` at build time would cut this by well over 90%.

12. **Full page reloads on back navigation.** `page.tsx` calls `window.location.reload()` on `popstate` and `tripPlanning/page.tsx` reloads on `pageshow` when `event.persisted` — both are workarounds for a font-loading glitch. They defeat client-side routing and the back-forward cache, and make navigation feel slow on mobile. The underlying font issue should be fixed instead.

13. **`position: -webkit-sticky` without the standard property.** `Header.module.css` sets only the prefixed value, so the header is not sticky in Firefox.

14. **`StationSelect` has no keyboard support beyond Tab.** No arrow-key navigation, no `role="combobox"`/`aria-activedescendant`, no `aria-expanded`, and the dropdown renders all 382 stations unvirtualised when the input is empty. The `<li>` options are click-only, so the control is not usable by keyboard or screen reader.

15. **Duplication and dead code.** `getCurrentDateTime` is defined identically in `page.tsx` and `tripPlanning/page.tsx`. The `viewport` export is repeated in all three layouts. `HomeButton.tsx` imports `./HomeButton.module.css`, **which does not exist** — it only builds because nothing imports `HomeButton`. `NavigationHandler`, `CsvHandler`, `trainLineColours` and most of `PAGE_PATHS` are also unreferenced.

16. **Stale copyright.** The footer reads "© 2021 RipView".

### Dependencies

17. **Next.js 15.1.4 is well behind** (16.x is current). React is 19.0.0. Worth planning a bump, particularly since Next 15.3+ moved lint out of `next build` by default, which changes issue #1.

18. **`es6-promise` and `portable-fetch` are legacy shims** required only by the Swagger 2.x generated client. Regenerating the client with a modern generator that targets native `fetch` would drop both.

---

## Roadmap

### Phase 0 — make it green

Fix the four lint errors so `npm run build` passes. Wire `next/jest` into `jest.config.ts`. Add a first test that feeds a captured `/trip` response fixture through the response mapper and asserts the rendered times. Delete `HomeButton.tsx` (or add its missing stylesheet) and the other dead files. This is a short, high-leverage pass and everything below depends on it.

### Phase 1 — a real domain model

Replace `string[][]` with typed objects mapped once, at the boundary:

```ts
type Journey = { legs: Leg[]; fare?: Fare };
type Leg = {
  mode: 'train' | 'metro' | 'bus' | 'ferry' | 'lightRail' | 'walk' | 'coach';
  line?: { number: string; name: string; colour: string };
  origin: StopCall;
  destination: StopCall;
  stops: StopCall[];        // from stopSequence
  durationSeconds: number;
};
type StopCall = {
  name: string;
  platform?: string;
  planned: Date;
  estimated?: Date;         // real-time, when available
  delayMinutes?: number;    // derived
};
```

Everything after this becomes straightforward: real-time delays, an expandable all-stops view, per-line colours, correct interchange counts, and formatting that happens in the component rather than in the fetch layer. Delete the client-side arrive-by filter and trust `depArrMacro=arr`. Wrap the fetch in `try`/`catch` and give `/tripPlanning` explicit loading, empty and error states.

### Phase 2 — the features that make it TripView

TripView's actual daily loop is not trip planning, it is *"what's the next train home"*. In rough order of value:

- **Saved trips / favourites.** A short list of station pairs on the home screen, each showing the next few departures. `localStorage` is enough; no accounts needed.
- **Departure board** via `/departure_mon` — the "next trains from here" view, optionally per-platform.
- **Live delays** surfaced from the estimated-vs-planned difference already in the response.
- **Service alerts** via `/add_info`, filtered to the user's saved lines and stops.
- **Live station search** via `/stop_finder`, which retires the vendored snapshot and extends the app past trains and metro. Note this also needs the hardcoded `exclMOT_*` exclusions in `planTrip()` relaxed — ideally into a user-facing mode filter — since they currently block bus, ferry, light rail and coach legs outright.
- **Fares** from `journey.fare.tickets`, respecting `evaluationTicket`.

### Phase 3 — the map question

The hand-drawn SVG covers 46% of stations and every extension is manual work. Three ways forward:

| Option | What it means | Trade-off |
|---|---|---|
| **Keep and finish the SVG** | Hand-add the ~205 missing stations, add pinch/drag via a pan-zoom wrapper, centre the zoom, fix the initial viewBox. | Preserves the schematic look users like, and no new dependencies — but it stays a manual artefact that goes stale every time the network changes, and it is a lot of tedious work. |
| **Geographic map** | MapLibre GL JS with vector tiles; station markers generated from the `LATITUDE`/`LONGITUDE` columns already in the dataset; route shapes from the TfNSW GTFS feed. | Complete coverage automatically, native pinch/zoom/pan on every platform, and route geometry can be drawn from `leg.coords`. But it loses the schematic clarity of a transit diagram, and adds a tile source and a real dependency. |
| **Demote the map** | Make search and saved trips the primary input, and treat the map as a secondary "browse the network" view. | Cheapest, and matches how the app is actually used — the map was never the fast path for a commuter. |

**Recommendation: demote the map now, then go geographic later if it still earns its place.** The map is where this project consumed the most effort for the least daily value; search plus favourites is the loop that makes the app worth installing. If a schematic map does come back, generate it from data rather than maintaining it by hand.

Regardless of the choice, drop `userScalable: false` from the viewport so the browser's own pinch-zoom works — that alone makes the current map far more usable on a phone.

### Phase 4 — make it a proper installable app

Consolidate to one complete manifest (`name`, `start_url`, `scope`, `theme_color`, `background_color`, typed and maskable icons) and delete the stale one. Add a service worker that pre-caches the shell and station list and serves the last-known timetable offline — the difference between a bookmark and something that works on a train in a tunnel. Inline the Font Awesome icons. Fix the safe-area padding with `env(safe-area-inset-top)`, and remove the `reload()` workarounds.

---

## Contributors

- Edwin Tang ([@edwintang2005](https://github.com/Edwintang2005))
- Justin Zhang ([@jstormatic](https://github.com/jstormatic))
- Rickey Lin ([@0xRickey](https://github.com/0xRickey))
- Roger Yao ([@rogeryao824](https://github.com/rogeryao824))

## Sources and documentation used

- [Trip Planning APIs: Technical Documentation](https://opendata.transport.nsw.gov.au/) v3.3 (TfNSW, April 2022) — the authoritative guide to `/trip`, `/departure_mon`, `/stop_finder`, `/add_info` and `/coord`, with worked examples for real-time, fares, stopping patterns and accessibility.
- [How to create a TfNSW API key](https://opendata.transport.nsw.gov.au/developers/userguide)
- [Public Transport Location Facilities and Operators](https://opendata.transport.nsw.gov.au/data/dataset/public-transport-location-facilities-and-operators/resource/e9d94351-f22d-46ea-b64d-10e7e238368a) — the source of `stationsInformation.json`. Available as `.csv`, `.tsv`, `.json` and `.xml`, or via a Data API limited to 5 calls per day.
- [Next.js documentation](https://nextjs.org/docs) — App Router, server actions, environment variables.
- [SVGR](https://react-svgr.com/) — the webpack loader that turns the network map into a React component.
- [How to Load Data from a File in Next.js?](https://www.geeksforgeeks.org/how-to-load-data-from-a-file-in-next-js/) (GeeksForGeeks)

## Licence

See [LICENSE](LICENSE).
