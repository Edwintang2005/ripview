import StationJson from '../app/data/stationsInformation.json';

export function getStationIdEntries() {
    let records = StationJson.records;
    records = records.filter((a) => /Train|Metro/.test((a[10] as string)));
    return records;
}

export function getStationNameFromId(id: string): string | null {
    if (id === null) {
        return null;
    }
    const records = getStationIdEntries();
    const station = records.filter((a) => (a[2] as string) == id)[0];
    return station ? station[1] as string : null;
}
