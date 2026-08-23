/**
 * Regenerates src/lib/stations.json from the vendored TfNSW location dataset.
 *
 * The source file (data/stationsInformation.json, ~291 KB) carries
 * phone numbers, addresses, facilities and accessibility prose for every stop
 * in NSW. The app needs a name, an id and a mode, so this projects the dataset
 * down to those and drops everything else — the difference between shipping
 * 297 KB to every browser and shipping about 20 KB.
 *
 * Run after refreshing the source dataset:
 *
 *     npm run data:stations
 *
 * Source: https://opendata.transport.nsw.gov.au/data/dataset/public-transport-location-facilities-and-operators
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../data/stationsInformation.json');
const TARGET = resolve(here, '../src/lib/stations.json');

// Positional indices into the dataset's `records` arrays.
const NAME = 1;
const TSN = 2;
const LATITUDE = 3;
const LONGITUDE = 4;
const TRANSPORT_MODE = 10;

const dataset = JSON.parse(readFileSync(SOURCE, 'utf8'));

const stations = dataset.records
    .filter((record) => /Train|Metro/.test(String(record[TRANSPORT_MODE] ?? '')))
    .map((record) => ({
        id: String(record[TSN]),
        name: String(record[NAME]),
        // Whether the station is on the Metro network, for the mode icon.
        metro: /Metro/.test(String(record[TRANSPORT_MODE] ?? '')),
        // Five decimal places is about a metre — ample for placing a marker,
        // and a third of the bytes of the raw precision.
        lat: Number(Number(record[LATITUDE]).toFixed(5)),
        lon: Number(Number(record[LONGITUDE]).toFixed(5)),
    }))
    // Stable alphabetical order so the file diffs cleanly between refreshes.
    .sort((a, b) => a.name.localeCompare(b.name));

const seen = new Set();
const deduped = stations.filter((station) => {
    if (seen.has(station.id)) {
        return false;
    }
    seen.add(station.id);
    return true;
});

writeFileSync(TARGET, `${JSON.stringify(deduped, null, 0)}\n`);

const sourceSize = readFileSync(SOURCE).length;
const targetSize = readFileSync(TARGET).length;
console.log(
    `Wrote ${deduped.length} stations to src/lib/stations.json ` +
    `(${(targetSize / 1024).toFixed(1)} KB, from ${(sourceSize / 1024).toFixed(1)} KB)`
);
