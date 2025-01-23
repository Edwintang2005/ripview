'use server';
import { DefaultApiFetchParamCreator as paramCreator, DefaultApi as DefApi, TripRequestResponse } from '../../../typescript-fetch-client/api';
import { Configuration } from '../../../typescript-fetch-client';

interface TripData{
    fromStation:string;
    toStation:string;
}

async function searchStop(searchString:string) {
    const tfStopRequester = paramCreator().tfnswStopfinderRequest;
    return tfStopRequester('rapidJSON', `&#x60;${searchString}&#x60;`, 'EPSG:4326', 'stop', 'true');
}

async function planTrip(fromId:string, toId:string) {
    const config = new Configuration();
    config.apiKey = process.env.TPNSWAPIKEY;
    const apiPlanner = new DefApi(config);
    return apiPlanner.tfnswTripRequest2('rapidJSON', 'EPSG:4326', 'dep', 'any', fromId, 'any', toId ,undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'true');
}

export async function FetchtripData(props: TripData) {
    let jsonObj = await planTrip((props.fromStation), (props.toStation));
    return jsonObj.toString();
}

// Function working on to convert TripRequestResponse to a processable format.
// function tripResponseToJson(res: TripRequestResponse): string {
//     if (res['journeys'] == null) {
//         return "ERROR";
//     }
//     var json = {};
//     for (let x in res['journeys']) {
//         json = 
//     }
//     return json.toString();
// }