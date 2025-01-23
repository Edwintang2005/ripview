'use server';
import { DefaultApi as DefApi, TripRequestResponse } from '../../../typescript-fetch-client/api';
import { Configuration } from '../../../typescript-fetch-client';

interface TripData{
    fromStation:string;
    toStation:string;
}
// Function that could be used to find a stop, this just gets the url params we would need to get stop info
// async function searchStop(searchString:string) {
//     const tfStopRequester = DefaultApiFetchParamCreator().tfnswStopfinderRequest;
//     return tfStopRequester('rapidJSON', `&#x60;${searchString}&#x60;`, 'EPSG:4326', 'stop', 'true');
// }

async function planTrip(fromId:string, toId:string) {
    const config = new Configuration();
    config.apiKey = process.env.TPNSWAPIKEY;
    const apiPlanner = new DefApi(config);
    const numberOfPossibleJourneys = 10;
    return apiPlanner.tfnswTripRequest2('rapidJSON', 'EPSG:4326', 'dep', 'any', fromId, 'any', toId, undefined, undefined, numberOfPossibleJourneys, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'true');
}

export async function FetchtripData(props: TripData): Promise<string[][]> {
    const jsonObj = await planTrip((props.fromStation), (props.toStation));
    return tripResponseToJson(jsonObj);
}

// Function working on to convert TripRequestResponse to a processable format.
function tripResponseToJson(res: TripRequestResponse): string[][] {
    if (res.journeys == null) {
        return [['ERROR']];
    }
    const legs : string[][] = [];
    res.journeys.forEach((x) => {
        const legsInfo: string[] = [];
        if (x.legs == null) {
            legsInfo.push('No Legs!');
        } else {
            x.legs.forEach((a) => {
                const origin = a.origin;
                const dest = a.destination;
                const transport = a.transportation;
                legsInfo.push('From: ' + origin?.name + ' To: ' + dest?.name + ' arriving at: ' + dest?.arrivalTimePlanned + ' on ' + transport?.name + '.');
            });
        }
        legs.push(legsInfo);
    });
    return legs;
}
