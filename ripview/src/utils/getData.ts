import StationJson from '../app/data/stationsInformation.json';

export function getStationIdEntries() {
    let records = StationJson.records;
    records = records.filter((a) => /Train|Metro/.test((a[10] as string)));
    return records;
}

export function getStationNameFromId(id: string) {
    if (id === null) {
        return null;
    }
    const records = getStationIdEntries();
    return records.filter((a) => (a[2] as string) == id)[0][1];
}
