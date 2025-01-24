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
// TripRequestResponse is like this -> .journeys = [TripRequestResponseJourney], this holds all possible trips
// TripRequestResponseJourney is like this -> .legs = [TripRequestResponseJourneyLeg], this holds all the legs for each trip
// TripRequestResponseJourneyLeg is like this -> .coords, .destination, .distance, .duration, .hints, .infos, .interchange, .origin, .stopSequence, .transportation
// Both .destination and .origin are TripRequestResponseJourneyLegStop, which holds information about name, platform etc.
function tripResponseToJson(res: TripRequestResponse): string[][] {
    if (res.journeys == null) {
        return [['ERROR']];
    }
    const legs: string[][] = [];
    res.journeys.forEach((x) => {
        if (x.legs == null) {
            legs.push(['No Legs!']);
        } else {
            x.legs.forEach((a) => {
                const origin = a.origin;
                const dest = a.destination;
                const transport = a.transportation;

                const departureTimeUTC = origin?.departureTimePlanned;
                const departureTimeAET = departureTimeUTC ? convertToEasternTime(departureTimeUTC) : 'Unknown time';

                const arrivalTimeUTC = dest?.arrivalTimePlanned;
                const arrivalTimeAET = arrivalTimeUTC ? convertToEasternTime(arrivalTimeUTC) : 'Unknown time';

                // Convert the object to an array of strings so that it can be displayed with <li> tags
                legs.push([
                    `From: ${origin?.name}. Departing at: ${departureTimeAET}`,
                    `To: ${dest?.name}. Arriving at ${arrivalTimeAET}`,
                    `On: ${transport?.name}`
                ]);
            });
        }
    });
    return legs;
}

// Helper function to convert UTC time to Australia Eastern Time
function convertToEasternTime(utcTime: string): string {
    const date = new Date(utcTime);
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    return new Intl.DateTimeFormat('en-AU', options).format(date);
}