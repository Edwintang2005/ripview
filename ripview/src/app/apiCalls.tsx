import { DefaultApiFetchParamCreator as paramCreator, DefaultApi as DefApi } from './../../typescript-fetch-client/api';

export async function searchStop(searchString:string) {
    const tfStopRequester = paramCreator().tfnswStopfinderRequest;
    return tfStopRequester('rapidJSON', `&#x60;${searchString}&#x60;`, 'EPSG:4326', 'stop', 'true');
}

export async function planTrip(fromId:string, toId:string) {
    const apiPlanner = new DefApi();
    return apiPlanner.tfnswTripRequest2('rapidJSON', 'EPSG:4326', 'dep', 'any', `&#x60;${fromId}&#x60;`, 'any', `&#x60;${toId}&#x60;`);
}
