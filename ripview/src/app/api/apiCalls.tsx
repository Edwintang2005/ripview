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

/**
 * Function to plan a trip from one station to another using the Transport for NSW API.
 *
 * @param fromId - The ID of the station to depart from.
 * @param toId - The ID of the station to arrive at.
 * @returns A promise that resolves to the trip data.
 */
async function planTrip(fromId:string, toId:string, isArr:boolean, date:string, time:string) {
    const config = new Configuration();
    config.apiKey = process.env.TPNSWAPIKEY;
    const apiPlanner = new DefApi(config);
    // This limits the number of possible journeys to retrieve
    const numberOfPossibleJourneys = 10;
    const isWheelchairAccessible = undefined; // Can be 'on' if on
    let depOrArr: 'dep' | 'arr' = 'dep';
    if (isArr) {
        depOrArr = 'arr';
    };
    return apiPlanner.tfnswTripRequest2('rapidJSON', 'EPSG:4326', depOrArr, 'any', fromId, 'any', toId, date, time, numberOfPossibleJourneys, isWheelchairAccessible, 'checkbox', undefined, undefined, '1', '1', '1', '1', '1', 'true');
}

/**
 * Fetches trip data for a given journey and converts it to a processable format for the frontend.
 * Can fetch both past and future trips based on the date provided.
 *
 * @param props - The TripData object containing the station IDs for the trip.
 * @returns A promise that resolves to the trip data in a processable format.
 */
export async function FetchtripData(props: TripData): Promise<string[][]> {
    // Get current time in Sydney and format helpers
    const sydneyNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    
    const formatForAPI = (date: Date) => {
        const d = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
        return {
            date: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`,
            time: `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
        };
    };

    // Create minimal set of time points
    const timePoints = new Set<string>();

    // Parse the requested time
    const requestedDate = props.time.includes('T') 
        ? new Date(props.time)
        : new Date(props.time.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

    // Add current time and requested time
    timePoints.add(props.date + props.time);

    // Calculate time intervals for both past and future trips
    const intervals = [];
    // Add intervals for past 24 hours in 3-hour steps
    for (let i = -24; i <= 0; i += 3) {
        intervals.push(i);
    }
    // Add intervals for future 24 hours in 3-hour steps
    for (let i = 3; i <= 24; i += 3) {
        intervals.push(i);
    }

    // For arrive by: focus on times before the requested time
    // For depart at: focus on times after the current time
    const baseTime = props.isArr ? requestedDate : sydneyNow;

    // Add strategic time points
    intervals.forEach(hours => {
        const time = new Date(baseTime.getTime() + hours * 3600000);
        const { date, time: timeStr } = formatForAPI(time);
        timePoints.add(date + timeStr);
    });

    // Convert to fetch ranges and sort
    const fetchRanges = Array.from(timePoints)
        .map(timeKey => ({
            date: timeKey.slice(0, 8),
            time: timeKey.slice(8)
        }))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    // Fetch all trips in parallel
    const results = await Promise.all(
        fetchRanges.map(range => 
            planTrip(props.fromStation, props.toStation, props.isArr, range.date, range.time)
        )
    );

    // Collect and deduplicate journeys
    const seen = new Set<string>();
    const allJourneys: any[] = [];
    
    results.forEach(result => {
        if (result.journeys?.length) {
            result.journeys.forEach((journey: any) => {
                if (!journey.legs?.[0]?.origin) return;
                
                const key = `${journey.legs[0].origin.departureTimeEstimated || journey.legs[0].origin.departureTimePlanned}_${journey.legs[0].origin.platform}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    allJourneys.push(journey);
                }
            });
        }
    });

    // Sort journeys
    allJourneys.sort((a, b) => {
        if (props.isArr) {
            // For "arrive by", sort by arrival time in reverse order
            const aTime = new Date(a.legs[a.legs.length - 1].destination.arrivalTimeEstimated || 
                                 a.legs[a.legs.length - 1].destination.arrivalTimePlanned).getTime();
            const bTime = new Date(b.legs[b.legs.length - 1].destination.arrivalTimeEstimated || 
                                 b.legs[b.legs.length - 1].destination.arrivalTimePlanned).getTime();
            return aTime - bTime; // Later arrivals first
        } else {
            // For "depart at", sort by departure time
            const aTime = new Date(a.legs[0].origin.departureTimeEstimated || 
                                 a.legs[0].origin.departureTimePlanned).getTime();
            const bTime = new Date(b.legs[0].origin.departureTimeEstimated || 
                                 b.legs[0].origin.departureTimePlanned).getTime();
            return aTime - bTime;
        }
    });

    return tripResponseToJson({
        ...results[0],
        journeys: allJourneys
    });
}

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

                // Calculate duration from departure and arrival times
                let formattedDuration = 'Unknown duration';
                if (departureTimeUTC && arrivalTimeUTC) {
                    const departureTime = new Date(departureTimeUTC);
                    const arrivalTime = new Date(arrivalTimeUTC);
                    
                    // Truncate seconds for both times so that there are no issues with calculating the duration such as rounding issues
                    departureTime.setSeconds(0);
                    arrivalTime.setSeconds(0);
                    
                    // Calculate the duration in minutes and hours and using Math.floor to ensure that there are no issues with rounding
                    const durationMinutes = Math.floor((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60));
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;
                    formattedDuration = `${hours > 0 ? `${hours} hours ` : ''}${minutes} minutes`;
                }

                // Convert the object to an array of strings so that it can be displayed with <li> tags
                journeyDetails.push(
                    `From: ${origin?.name}. Departing at: ${departureTimeAET}`,
                    `To: ${dest?.name}. Arriving at ${arrivalTimeAET}`,
                    `On: ${transport?.name || transport?.product?.name}`,
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
