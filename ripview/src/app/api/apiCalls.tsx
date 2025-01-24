'use server';
import { DefaultApi as DefApi, TripRequestResponse } from '../../../typescript-fetch-client/api';
import { Configuration } from '../../../typescript-fetch-client';

interface TripData{
    fromStation:string;
    toStation:string;
    isArr:boolean;
    date:string;
    time:string;
}
// Function that could be used to find a stop, this just gets the url params we would need to get stop info
// async function searchStop(searchString:string) {
//     const tfStopRequester = DefaultApiFetchParamCreator().tfnswStopfinderRequest;
//     return tfStopRequester('rapidJSON', `&#x60;${searchString}&#x60;`, 'EPSG:4326', 'stop', 'true');
// }

async function planTrip(fromId:string, toId:string, isArr:boolean, date:string, time:string) {
    const config = new Configuration();
    config.apiKey = process.env.TPNSWAPIKEY;
    const apiPlanner = new DefApi(config);
    const numberOfPossibleJourneys = 10;
    let depOrArr: 'dep' | 'arr' = 'dep';
    if (isArr) {
        depOrArr = 'arr'
    }
    return apiPlanner.tfnswTripRequest2('rapidJSON', 'EPSG:4326', depOrArr, 'any', fromId, 'any', toId, date, time, numberOfPossibleJourneys, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'true');
}

export async function FetchtripData(props: TripData): Promise<string[][]> {
    const jsonObj = await planTrip(props.fromStation, props.toStation, props.isArr, props.date, props.time);
    return tripResponseToJson(jsonObj);
}

// Function working on to convert TripRequestResponse to a processable format.
// TripRequestResponse is like this -> .journeys = [TripRequestResponseJourney], this holds all possible trips
// TripRequestResponseJourney is like this -> .legs = [TripRequestResponseJourneyLeg], this holds all the legs for each trip
// TripRequestResponseJourneyLeg is like this -> .coords, .destination, .distance, .duration, .hints, .infos, .interchange, .origin, .stopSequence, .transportation
// Both .destination and .origin are TripRequestResponseJourneyLegStop, which holds information about name, platform etc.
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
