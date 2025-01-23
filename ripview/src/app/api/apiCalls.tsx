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

export async function FetchtripData(props: TripData): Promise<string[]> {
    let jsonObj = await planTrip((props.fromStation), (props.toStation));
    return tripResponseToJson(jsonObj);
}

// Function working on to convert TripRequestResponse to a processable format.
function tripResponseToJson(res: TripRequestResponse): string[] {
    if (res['journeys'] == null) {
        return ["ERROR"];
    }
    var legs : string[] = [];
    res['journeys'].forEach((x) => {
        var legsInfo = "";
        x['legs']?.forEach((a) => {
            const dest = a['destination'];
            const transport = a['transportation'];
            legsInfo += 'Leg Info -> Name: ' + dest?.name + ' leaving at: ' + dest?.departureTimeEstimated + ' on ' + transport?.product + '. ';
        })
        legs.push(legsInfo);
    })
    return legs;
}