import { DefaultApiFetchParamCreator as query } from './../../typescript-fetch-client/api';

export async function searchStop(searchString:string) {
    const tfStopRequester = query().tfnswStopfinderRequest;
    return tfStopRequester("rapidJSON", `&#x60;${searchString}&#x60;`, 'EPSG:4326', 'stop', "true");
}
