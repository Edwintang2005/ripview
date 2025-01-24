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

/**
 * Function to plan a trip from one station to another using the Transport for NSW API.
 * 
 * @param fromId - The ID of the station to depart from.
 * @param toId - The ID of the station to arrive at.
 * @returns A promise that resolves to the trip data.
 */
async function planTrip(fromId:string, toId:string) {
    const config = new Configuration();
    config.apiKey = process.env.TPNSWAPIKEY;
    const apiPlanner = new DefApi(config);
    // This limits the number of possible journeys to retrieve
    const numberOfPossibleJourneys = 10;
    return apiPlanner.tfnswTripRequest2('rapidJSON', 'EPSG:4326', 'dep', 'any', fromId, 'any', toId, undefined, undefined, numberOfPossibleJourneys, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'true');
}

/**
 * Fetches trip data for a given journey and converts it to a processable format for the frontend.
 * 
 * @param props - The TripData object containing the station IDs for the trip.
 * @returns A promise that resolves to the trip data in a processable format.
 */
export async function FetchtripData(props: TripData): Promise<string[][]> {
    const jsonObj = await planTrip((props.fromStation), (props.toStation));
    return tripResponseToJson(jsonObj);
}

// Function working on to convert TripRequestResponse to a processable format.
// TripRequestResponse is like this -> .journeys = [TripRequestResponseJourney], this holds all possible trips
// TripRequestResponseJourney is like this -> .legs = [TripRequestResponseJourneyLeg], this holds all the legs for each trip
// TripRequestResponseJourneyLeg is like this -> .coords, .destination, .distance, .duration, .hints, .infos, .interchange, .origin, .stopSequence, .transportation
// Both .destination and .origin are TripRequestResponseJourneyLegStop, which holds information about name, platform etc.

/**
 * Converts a TripRequestResponse object to processable format for the frontend
 * 
 * Note that the response object contains multiple journeys, each of which may consist of multiple legs.
 * 
 * - TripRequestResponse:
 *     - journeys: TripRequestResponseJourney[], an array of journeys representing all possible trips
 * 
 * - TripRequestResponseJourney:
 *    - legs: TripRequestResponseJourneyLeg[], an array of legs representing the different parts of a journey
 * 
 * - TripRequestResponseJourneyLeg:
 *    - coords: Coordinates of the leg.
 *    - destination: TripRequestResponseJourneyLegStop, the destination stop of the leg.
 *    - distance: Distance of the leg.
 *    - duration: Duration of the leg in seconds.
 *    - hints: Additional hints or information.
 *    - infos: Additional information about the leg.
 *    - interchange: Information about interchanges.
 *    - origin: TripRequestResponseJourneyLegStop, the origin stop of the leg.
 *    - stopSequence: Sequence of stops in the leg.
 *    - transportation: Information about the transportation mode.
 * 
 * - TripRequestResponseJourneyLegStop:
 *   - name: Name of the stop, including the platform.
 * 
 * The function processes each journey and its legs, extracting the relevant information and converting it to a format that can be displayed on the frontend. It converts the departure and arrival times to Australia Eastern Time (AET) and the duration from seconds to hours and minutes.
 * @param res - The TripRequestResponse object containing the journeys and legs.
 * @returns An array of journeys, each represented as an array of strings for display on the frontend.
 */
function tripResponseToJson(res: TripRequestResponse): string[][] {
    if (res.journeys == null) {
        return [['ERROR']];
    }

    const journeys: string[][] = [];
    res.journeys.forEach((journey) => {
        const journeyDetails: string[] = [];
        if (journey.legs == null) {
            journeyDetails.push('No Legs!');
        } else {
            journey.legs.forEach((leg) => {
                const origin = leg.origin;
                const dest = leg.destination;
                const transport = leg.transportation;

                // Extract and convert the departure and arrival times to AET
                const departureTimeUTC = origin?.departureTimePlanned;
                const departureTimeAET = departureTimeUTC ? convertToEasternTime(departureTimeUTC) : 'Unknown time';

                const arrivalTimeUTC = dest?.arrivalTimePlanned;
                const arrivalTimeAET = arrivalTimeUTC ? convertToEasternTime(arrivalTimeUTC) : 'Unknown time';

                // Convert duration from seconds to hours and minutes
                const durationSeconds = leg.duration || 0;
                const hours = Math.floor(durationSeconds / 3600);
                const minutes = Math.floor((durationSeconds % 3600) / 60);
                const formattedDuration = `${hours > 0 ? `${hours} hours ` : ''}${minutes} minutes`;

                // Convert the object to an array of strings so that it can be displayed with <li> tags
                journeyDetails.push(
                    `From: ${origin?.name}. Departing at: ${departureTimeAET}`,
                    `To: ${dest?.name}. Arriving at ${arrivalTimeAET}`,
                    `On: ${transport?.name}`,
                    `Duration: ${formattedDuration}`
                );
            });
        }
        journeys.push(journeyDetails);

    });
    return journeys;
}

/**
 * Helper function to convert UTC time to Australia Eastern Time (AET).
 * 
 * @param utcTime - The UTC time string to convert.
 * @returns The time string converted to AET.
 *  */
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