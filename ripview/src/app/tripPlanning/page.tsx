'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FetchtripData } from '../api/apiCalls';
import { getStationNameFromId } from '@/utils/getData';
import trainLineColours from '@/config/trainLineColours';
import styles from './tripPlanning.module.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import SubHeader from '@/components/SubHeader';

export default function Home() {
    const [jsonData, setjsonData] = useState([['Loading...']]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [recentDepartedTrip, setRecentDepartedTrip] = useState<string[] | null>(null);
    const [nextTripIndex, setNextTripIndex] = useState<number | null>(null);
    const searchParams = useSearchParams();
    const fromStation = searchParams.get('fromStations');
    const toStation = searchParams.get('toStations');
    const isArr = searchParams.get('depOrArr')?.includes('arr');
    const timePreference = searchParams.get('timePreference');
    const time = searchParams.get('time');

    const fromName = getStationNameFromId(fromStation as string);
    const toName = getStationNameFromId(toStation as string);
    const [expandedTrip, setExpandedTrip] = useState<number | null>(null);

    const nextTripRef = useRef<HTMLDivElement>(null);
    const initialScrollDone = useRef(false);

    useEffect(() => {
        // Set current page
        sessionStorage.setItem('lastPage', '/tripPlanning');

        // Add pageshow event listener for bfcache
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    useEffect(() => {
        // Function to update time and find next trip
        const updateTimeAndTrips = () => {
            const now = new Date();
            setCurrentTime(now);
            
            // Find the next upcoming trip based on current time
            if (jsonData.length > 0 && jsonData[0]?.[0] !== 'Loading...') {
                const nextIndex = jsonData.findIndex(trip => {
                    const departureInfo = trip.find(info => info.startsWith('From:'));
                    if (!departureInfo) return false;
                    const timeMatch = departureInfo.match(/From: .+\. Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                    if (!timeMatch) return false;
                    
                    // Parse date components
                    const [datePart, timePart] = timeMatch[1].split(', ');
                    const [day, month, year] = datePart.split('/').map(Number);
                    const [hours, minutes] = timePart.split(':').map(Number);
                    
                    // Create date with correct components
                    const departureTime = new Date(year, month - 1, day, hours, minutes);
                    
                    return departureTime.getTime() > now.getTime();
                });

                setNextTripIndex(nextIndex >= 0 ? nextIndex : null);
            }
        };

        // Calculate delay until the start of the next minute
        const now = new Date();
        const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        // Initial update
        updateTimeAndTrips();

        // Set timeout to sync with the start of the next minute
        const initialTimeout = setTimeout(() => {
            updateTimeAndTrips();
            
            // Then set interval to run every minute, exactly on the minute
            const interval = setInterval(updateTimeAndTrips, 60000);
            
            // Cleanup interval on component unmount
            return () => clearInterval(interval);
        }, msUntilNextMinute);

        // Cleanup timeout on component unmount
        return () => clearTimeout(initialTimeout);
    }, [jsonData]);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Helper function to format time with optional date
    const formatTimeWithDate = (timeStr: string) => {
        const [datePart, timePart] = timeStr.split(', ');
        const [day, month, year] = datePart.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        // Remove seconds from time if present
        const timeWithoutSeconds = timePart.replace(/:\d{2}(?=\s|$)/, '');
        
        return isToday(date) ? timeWithoutSeconds : `${datePart}, ${timeWithoutSeconds}`;
    };

    // Format the datetime for display
    const formatDateTime = (dateTimeStr: string) => {
        const dt = new Date(dateTimeStr);
        return dt.toLocaleString('en-AU', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Australia/Sydney'
        });
    };

    // Function to format station name consistently
    const formatStationName = (stationInfo: string | undefined) => {
        if (!stationInfo) return '';
        const parts = stationInfo.split(', ');
        if (parts.length < 2) return stationInfo;

        // Get main station name without "Station" and suburb, and remove From/To prefix
        const mainName = parts[0]
            .replace(' Station', '')
            .replace('From: ', '')
            .replace('To: ', '');
        
        // Get platform if it exists
        const platform = parts.find(part => part.startsWith('Platform'));

        return platform ? `${mainName}, ${platform}` : mainName;
    };

    // Get time preference text
    const getTimePreferenceText = () => {
        if (!time) return '';
        if (timePreference === 'current') {
            return `Showing trips from current time (${formatDateTime(currentTime.toISOString())})`;
        } else {
            const formattedTime = formatDateTime(time);
            return `Showing trips ${isArr ? 'arriving by' : 'departing at'} ${formattedTime}`;
        }
    };

    const getCurrentDateTime = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const dtime = searchParams.get('time') || getCurrentDateTime();
    const date = dtime.split('T')[0].replaceAll('-', '');
    const timeValue = dtime.split('T')[1].replace(':', '');

    // Filter trips based on time preference
    const filterTrips = (trips: string[][]) => {
        if (!time || !isArr) return trips;

        // For "arrive by" searches, filter out trips that arrive after the specified time
        if (isArr) {
            try {
                let targetDateTime: Date;

                if (time.includes('T')) {
                    targetDateTime = new Date(time);
                } else {
                    const [datePart, timePart] = time.split(', ');
                    if (!datePart || !timePart) return trips;

                    const [day, month, year] = datePart.split('/').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    targetDateTime = new Date(year, month - 1, day, hour, minute);
                }

                if (isNaN(targetDateTime.getTime())) return trips;

                const now = new Date();
                const filteredTrips = trips.filter(trip => {
                    const departureInfo = trip.find(info => info.startsWith('From:'));
                    if (!departureInfo) return false;
                    const timeMatch = departureInfo.match(/From: .+\. Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                    if (!timeMatch) return false;
                    const depTimeStr = timeMatch[1];
                    const [depDatePart, depTimePart] = depTimeStr.split(', ');
                    if (!depDatePart || !depTimePart) return false;

                    const [depDay, depMonth, depYear] = depDatePart.split('/').map(Number);
                    const [depHour, depMinute] = depTimePart.split(':').map(Number);
                    const departureTime = new Date(depYear, depMonth - 1, depDay, depHour, depMinute);

                    if (departureTime <= now) return false;

                    const arrivalInfo = trip.find(info => info.startsWith('To:'));
                    if (!arrivalInfo) return false;

                    const timeMatchArr = arrivalInfo.match(/To: .+\. Arriving at (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                    if (!timeMatchArr) return false;

                    const timeStrArr = timeMatchArr[1];
                    const [arrDatePart, arrTimePart] = timeStrArr.split(', ');
                    if (!arrDatePart || !arrTimePart) return false;

                    const [arrDay, arrMonth, arrYear] = arrDatePart.split('/').map(Number);
                    const [arrHour, arrMinute] = arrTimePart.split(':').map(Number);
                    const arrivalDateTime = new Date(arrYear, arrMonth - 1, arrDay, arrHour, arrMinute);
                    
                    return !isNaN(arrivalDateTime.getTime()) && arrivalDateTime <= targetDateTime;
                });

                if (filteredTrips.length === 0) {
                    return [['No trips found that arrive before or at your requested time.']];
                }
                return filteredTrips;
            } catch {
                return trips;
            }
        }
        return trips;
    };

    useEffect(() => {
        const fetchData = async () => {
            if (fromStation && toStation && time) {
                try {
                    setjsonData([['Loading...']]);
                    const data = await FetchtripData({
                        fromStation,
                        toStation,
                        isArr: isArr || false,
                        date,
                        time: timeValue
                    });

                    // Separate future and past trips
                    const now = new Date();
                    const futureTrips: string[][] = [];
                    const pastTrips: string[][] = [];
                    let mostRecentDepartedTrip: string[] | null = null;
                    let mostRecentDepartureTime: Date | null = null;

                    // Create a Set to track unique trip times
                    const seenTripTimes = new Set();

                    // Parse the user's selected time
                    const selectedTime = time && time !== 'current' 
                        ? new Date(time.includes('T') ? time : time.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
                        : new Date();

                    // Create functions to parse times
                    const parseDepartureTime = (trip: string[]) => {
                        const departureInfo = trip.find((i: string) => i.startsWith('From:'));
                        if (!departureInfo) return null;
                        const timeMatch = departureInfo.match(/From: .+\. Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                        if (!timeMatch) return null;
                        const [datePart, timePart] = timeMatch[1].split(', ');
                        const [day, month, year] = datePart.split('/').map(Number);
                        const [hours, minutes] = timePart.split(':').map(Number);
                        return new Date(year, month - 1, day, hours, minutes);
                    };

                    const parseArrivalTime = (trip: string[]) => {
                        const arrivalInfo = trip.find((i: string) => i.startsWith('To:'));
                        if (!arrivalInfo) return null;
                        const timeMatch = arrivalInfo.match(/To: .+\. Arriving at (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                        if (!timeMatch) return null;
                        const [datePart, timePart] = timeMatch[1].split(', ');
                        const [day, month, year] = datePart.split('/').map(Number);
                        const [hours, minutes] = timePart.split(':').map(Number);
                        return new Date(year, month - 1, day, hours, minutes);
                    };

                    for (const trip of data) {
                        const departureTime = parseDepartureTime(trip);
                        if (!departureTime) continue;

                        const timeKey = isArr 
                            ? parseArrivalTime(trip)?.toISOString() 
                            : departureTime.toISOString();
                        
                        if (!timeKey) continue;

                        // Skip if we've already seen this time
                        if (seenTripTimes.has(timeKey)) continue;
                        seenTripTimes.add(timeKey);

                        // For depart at: only include trips at or after the selected time
                        // For arrive by: only include trips arriving before or at the selected time
                        // For current time: include all trips
                        if (!isArr && timePreference !== 'current') {
                            if (departureTime < selectedTime) continue;
                        } else if (isArr && timePreference !== 'current') {
                            const arrivalTime = parseArrivalTime(trip);
                            if (!arrivalTime || arrivalTime > selectedTime) continue;
                        }

                        if (departureTime > now) {
                            futureTrips.push(trip);
                        } else {
                            pastTrips.push(trip);
                            if (!mostRecentDepartureTime || departureTime > mostRecentDepartureTime) {
                                mostRecentDepartedTrip = trip;
                                mostRecentDepartureTime = departureTime;
                            }
                        }
                    }

                    // Sort trips by appropriate time
                    const sortTrips = (a: string[], b: string[]) => {
                        if (isArr) {
                            const timeA = parseArrivalTime(a);
                            const timeB = parseArrivalTime(b);
                            if (!timeA || !timeB) return 0;
                            return timeB.getTime() - timeA.getTime(); // Latest arrivals first
                        } else {
                            const timeA = parseDepartureTime(a);
                            const timeB = parseDepartureTime(b);
                            if (!timeA || !timeB) return 0;
                            return timeA.getTime() - timeB.getTime(); // Earliest departures first
                        }
                    };

                    pastTrips.sort(sortTrips);
                    futureTrips.sort(sortTrips);

                    // Combine past and future trips
                    const allTrips = [...pastTrips, ...futureTrips];

                    // Function to validate trip legs
                    const isValidTripSequence = (legs: string[][]) => {
                        for (let i = 0; i < legs.length - 1; i++) {
                            const currentLeg = legs[i];
                            const nextLeg = legs[i + 1];

                            // Get arrival time of current leg
                            const currentArrival = currentLeg.find(info => info.startsWith('To:'))?.match(/Arriving at (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                            // Get departure time of next leg
                            const nextDeparture = nextLeg.find(info => info.startsWith('From:'))?.match(/Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);

                            if (currentArrival && nextDeparture) {
                                const arrivalTime = new Date(currentArrival[1].replace(/, /, ' '));
                                const departureTime = new Date(nextDeparture[1].replace(/, /, ' '));
                                
                                // If next leg departs before current leg arrives, the sequence is invalid
                                if (departureTime.getTime() <= arrivalTime.getTime()) {
                                    return false;
                                }
                            }
                        }
                        return true;
                    };

                    // Group the trip items into legs and filter invalid trips
                    const groupAndValidateTrips = (trips: string[][]) => {
                        return trips.filter(trip => {
                            // Group the trip items into legs
                            const legs: string[][] = [];
                            let currentLeg: string[] = [];
                            
                            trip.forEach((info) => {
                                if (info.startsWith('From:') && currentLeg.length > 0) {
                                    legs.push([...currentLeg]);
                                    currentLeg = [];
                                }
                                currentLeg.push(info);
                            });
                            if (currentLeg.length > 0) {
                                legs.push(currentLeg);
                            }

                            // Check if the trip sequence is valid
                            return isValidTripSequence(legs);
                        });
                    };

                    // Find index of next upcoming trip
                    const nextUpcomingIndex = groupAndValidateTrips(allTrips).findIndex(trip => {
                        const departureTime = parseDepartureTime(trip);
                        if (!departureTime) return false;
                        return departureTime > now;
                    });

                    setNextTripIndex(nextUpcomingIndex >= 0 ? nextUpcomingIndex : null);
                    setjsonData(filterTrips(groupAndValidateTrips(allTrips)));
                    setRecentDepartedTrip(mostRecentDepartedTrip);
                } catch (error) {
                    setjsonData([['Error fetching trip data']]);
                    setRecentDepartedTrip(null);
                }
            }
        };
        fetchData();
    }, [fromStation, toStation, time, isArr, date, timeValue]);

    // Effect to scroll to next trip when data loads
    useEffect(() => {
        const scrollToNextTrip = () => {
            if (nextTripRef.current && nextTripIndex !== null && !initialScrollDone.current) {
                const element = nextTripRef.current;
                const headerOffset = 140;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                initialScrollDone.current = true;
            }
        };

        // Initial scroll attempt
        scrollToNextTrip();
        
        // Backup scroll attempt after a delay
        const timeoutId = setTimeout(scrollToNextTrip, 500);
        
        return () => clearTimeout(timeoutId);
    }, [nextTripIndex, jsonData]);

    // Function to get the number of train line changes
    const getNumberOfTrainLineChanges = (trip: string[]) => {
        // Number of train line changes is one less than the number of legs
        const numberOfLegs = trip.filter((info) => info.startsWith('From:')).length;
        return numberOfLegs > 1 ? numberOfLegs - 1 : 0;
    };

    // Function to check if the trip has train line changes
    const hasTrainLineChanges = (trip: string[]) => {
        return getNumberOfTrainLineChanges(trip) > 0;
    };

    // Function to extract train line info
    const extractTrainLine = (info: string) => {
        const match = info.match(/Sydney Trains Network\s+(.+)/);
        return match ? match[1] : info;
    };

    // Function to get train line color
    const getTrainLineColor = (trainLine: string) => {
        const color = Object.entries(trainLineColours).find(([key]) =>
            trainLine.includes(key)
        );
        return color ? color[1] : '#6f818d';
    };

    const handleTripClick = (tripIndex: number) => {
        // If clicking the same trip, just close it
        if (expandedTrip === tripIndex) {
            setExpandedTrip(null);
            return;
        }

        // Step 1: Close any open trip
        setExpandedTrip(null);

        // Step 2: Wait for the closing animation
        setTimeout(() => {
            // Step 3: Open the new trip
            setExpandedTrip(tripIndex);

            // Step 4: Wait for the opening animation and DOM update
            setTimeout(() => {
                const tripElement = document.getElementById(`trip-main-${tripIndex}`);
                if (tripElement) {
                    const offset = 170;
                    const elementTop = tripElement.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({
                        top: elementTop - offset,
                        behavior: 'smooth'
                    });
                }
            }, 200); // Longer wait to ensure the animation is complete
        }, 300); // Longer wait to ensure the closing is complete
    };

    // Function to calculate total duration from multiple legs
    const calculateTotalDuration = (trip: string[]) => {
        // Group the trip into legs
        const legs: string[][] = [];
        let currentLeg: string[] = [];
        
        trip.forEach((info) => {
            if (info.startsWith('From:') && currentLeg.length > 0) {
                legs.push([...currentLeg]);
                currentLeg = [];
            }
            currentLeg.push(info);
        });
        if (currentLeg.length > 0) {
            legs.push(currentLeg);
        }

        // Calculate leg durations and wait times
        let totalDuration = 0;

        legs.forEach((leg, index) => {
            // Add leg duration
            const durationInfo = leg.find(info => info.startsWith('Duration:'));
            if (durationInfo) {
                const hoursMatch = durationInfo.match(/Duration: (\d+) hours? (\d+) minutes?/);
                if (hoursMatch) {
                    const hours = parseInt(hoursMatch[1]);
                    const minutes = parseInt(hoursMatch[2]);
                    totalDuration += hours * 60 + minutes;
                } else {
                    const minutesMatch = durationInfo.match(/Duration: (\d+) minutes?/);
                    if (minutesMatch) {
                        totalDuration += parseInt(minutesMatch[1]);
                    }
                }
            }

            // Add wait time to next leg if it exists
            if (index < legs.length - 1) {
                const waitTime = calculateWaitingTime(leg, legs[index + 1]);
                if (waitTime) {
                    totalDuration += waitTime;
                }
            }
        });

        // Format the duration
        if (totalDuration < 60) {
            return `${totalDuration}m`;
        } else {
            const hours = Math.floor(totalDuration / 60);
            const mins = totalDuration % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
    };

    // Function to format trip information
    const formatTripInfo = (info: string) => {
        if (info.startsWith('From:')) {
            const [location, time] = info.split('Departing at:');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, '');
            return (
                <>
                    <div>{formatStationName(location)}</div>
                    <div className={styles.timeInfo}>
                        {formattedTime}
                    </div>
                </>
            );
        }
        if (info.startsWith('To:')) {
            const [location, time] = info.split('Arriving at');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, '');
            return (
                <>
                    <div>{formatStationName(location)}</div>
                    <div className={styles.timeInfo}>
                        {formattedTime}
                    </div>
                </>
            );
        }
        if (info.startsWith('Duration:')) {
            return (
                <>
                    <div>{info}</div>
                </>
            );
        }
        if (info.includes('minute wait')) {
            const match = info.match(/(\d+) minute wait/);
            if (match) {
                const minutes = parseInt(match[1]);
                return (
                    <>
                        <div>{formatMinutesToTime(minutes)}</div>
                    </>
                );
            }
        }
        if (info.startsWith('On:')) {
            return (
                <div className={styles.trainLine}>
                    {info.replace('On: Sydney Trains Network', '').trim()}
                </div>
            );
        }
        return null;
    };

    // Function to format minutes into hours and minutes
    const formatMinutesToTime = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes} minute wait`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m wait`;
        }
    };

    // Function to format time difference
    const formatTimeDifference = (diffMins: number) => {
        const absDiff = Math.abs(diffMins);
        
        if (absDiff < 60) {
            return `${absDiff}m`;
        } else if (absDiff < 24 * 60) {
            const hours = Math.floor(absDiff / 60);
            const mins = absDiff % 60;
            return `${hours}h ${mins}m`;
        } else {
            const days = Math.floor(absDiff / (24 * 60));
            const remainingMins = absDiff % (24 * 60);
            const hours = Math.floor(remainingMins / 60);
            const mins = remainingMins % 60;
            
            // Always show at least days and hours for consistency
            return `${days}d ${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
        }
    };

    // Function to calculate waiting time
    const calculateWaitingTime = (currentLeg: string[], nextLeg: string[]) => {
        const currentArrivalInfo = currentLeg.find(info => info.startsWith('To:'));
        const nextDepartureInfo = nextLeg.find(info => info.startsWith('From:'));

        if (!currentArrivalInfo || !nextDepartureInfo) return null;

        const arrMatch = currentArrivalInfo.match(/To: .+\. Arriving at (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
        const depMatch = nextDepartureInfo.match(/From: .+\. Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);

        if (!arrMatch || !depMatch) return null;

        const arrivalTime = new Date(arrMatch[1].replace(/, /, ' '));
        const departureTime = new Date(depMatch[1].replace(/, /, ' '));
        const waitingTime = Math.round((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60));

        return waitingTime > 0 ? waitingTime : null;
    };

    // Function to calculate time difference between actual and target times
    const calculateTimeDifference = (actualTimeStr: string, targetTimeStr: string) => {
        if (!actualTimeStr || !targetTimeStr) return null;

        // Parse the actual time
        const [actualDatePart, actualTimePart] = actualTimeStr.split(', ');
        const [actualDay, actualMonth, actualYear] = actualDatePart.split('/').map(Number);
        const [actualHours, actualMinutes] = actualTimePart.split(':').map(Number);
        const actualTime = new Date(actualYear, actualMonth - 1, actualDay, actualHours, actualMinutes);

        // Parse the target time
        const targetTime = new Date(targetTimeStr.includes('T') 
            ? targetTimeStr 
            : targetTimeStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

        // Calculate difference in minutes
        const diffMs = targetTime.getTime() - actualTime.getTime();
        return Math.round(diffMs / (1000 * 60));
    };

    // Calculate time until departure
    const calculateTimeUntilDeparture = (dateTimeStr: string) => {
        const now = new Date();
        const [datePart, timePart] = dateTimeStr.split(', ');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const departureTime = new Date(year, month - 1, day, hours, minutes);
        
        // Calculate difference in minutes
        const diffMs = departureTime.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / (1000 * 60));
        
        return formatTimeDifference(diffMins);
    };

    return (
        <div className={styles.page}>
            <Header title={`Trip From ${fromName} to ${toName}!`} />
            <SubHeader timeInfo={getTimePreferenceText()} />
            <main className={styles.main}>
                <div className={styles.tripContent}>
                    <div className={styles.tripDetails}>
                        <p>Showing trips for: {getTimePreferenceText()}</p>
                    </div>
                    {/* Display future trips */}
                    {jsonData.map((trip, tripIndex) => {
                        // Extract departure and arrival info
                        const departureInfos = trip.filter(info => info.startsWith('From:'));
                        const arrivalInfos = trip.filter(info => info.startsWith('To:'));
                        
                        // Get the first departure and last arrival for multi-leg journeys
                        const firstDepartureInfo = departureInfos[0]?.split('Departing at:');
                        const lastArrivalInfo = arrivalInfos[arrivalInfos.length - 1]?.split('Arriving at');

                        return (
                            <div
                                key={tripIndex}
                                id={`trip-${tripIndex}`}
                                className={`${styles.tripOption} ${expandedTrip === tripIndex ? styles.expanded : ''} ${tripIndex === nextTripIndex ? styles.nextTrip : ''}`}
                                ref={tripIndex === nextTripIndex ? nextTripRef : null}
                                onClick={() => handleTripClick(tripIndex)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleTripClick(tripIndex);
                                    }
                                }}
                            >
                                <div className={styles.tripSummary}>
                                    <div 
                                        id={`trip-main-${tripIndex}`}
                                        className={styles.tripMainInfo}
                                    >
                                        <div className={styles.stationContainer}>
                                            <div className={styles.stationName}>
                                                {formatStationName(firstDepartureInfo?.[0])}
                                            </div>
                                            <div className={styles.stationTime}>
                                                {firstDepartureInfo && `${formatTimeWithDate(firstDepartureInfo[1])}`}
                                                {!isArr && firstDepartureInfo?.[1] && time && timePreference !== 'current' && (() => {
                                                    const departureTime = firstDepartureInfo[1];
                                                    if (!departureTime) return null;
                                                    const diff = calculateTimeDifference(departureTime, time);
                                                    if (diff === null) return null;
                                                    return (
                                                        <div className={styles.timeDifference}>
                                                            ({formatTimeDifference(Math.abs(diff))} after requested time)
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className={`${styles.stationContainer} ${styles.right}`}>
                                            <div className={styles.stationName}>
                                                {formatStationName(lastArrivalInfo?.[0])}
                                            </div>
                                            <div className={styles.stationTime}>
                                                {lastArrivalInfo && `${formatTimeWithDate(lastArrivalInfo[1])}`}
                                                {isArr && lastArrivalInfo?.[1] && time && timePreference !== 'current' && (() => {
                                                    const arrivalTime = lastArrivalInfo[1];
                                                    if (!arrivalTime) return null;
                                                    const diff = calculateTimeDifference(arrivalTime, time);
                                                    if (diff === null) return null;
                                                    return (
                                                        <div className={styles.timeDifference}>
                                                            ({formatTimeDifference(Math.abs(diff))} before requested time)
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.rightSection}>
                                        {hasTrainLineChanges(trip) && (
                                            <div className={styles.legsInfo}>
                                                {`${getNumberOfTrainLineChanges(trip)} train line change(s)`}
                                            </div>
                                        )}
                                        <div className={`${styles.tripStatusSection} ${
                                            firstDepartureInfo?.[1] ? (() => {
                                                const [datePart, timePart] = firstDepartureInfo[1].trim().split(', ');
                                                if (!datePart || !timePart) return styles.tripStatusUpcoming;
                                                const [day, month, year] = datePart.split('/').map(Number);
                                                const [hours, minutes] = timePart.split(':').map(Number);
                                                const departureTime = new Date(year, month - 1, day, hours, minutes);
                                                return departureTime < new Date() ? styles.tripStatusDeparted : styles.tripStatusUpcoming;
                                            })() : styles.tripStatusUpcoming
                                        }`}>
                                            <div className={styles.tripInfoBox}>
                                                {(() => {
                                                    const timeUntil = firstDepartureInfo?.[1] ? calculateTimeUntilDeparture(firstDepartureInfo[1]) : null;
                                                    return (
                                                        <>
                                                            {timeUntil && (
                                                                <div className={styles.timeUntilDeparture}>
                                                                    {timeUntil}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className={styles.expandIcon}>
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`${styles.tripDetails} ${expandedTrip === tripIndex ? styles.visible : ''}`}>
                                    <div className={styles.tripExtendedInfo}>
                                        <div className={styles.transportLines}>
                                            {trip
                                                .filter(info => info.startsWith('On:'))
                                                .map((transportInfo, index) => {
                                                    const trainLine = extractTrainLine(transportInfo.replace('On: ', ''));
                                                    const color = getTrainLineColor(trainLine);

                                                    return (
                                                        <div key={index} className={styles.transportLine}>
                                                            <div
                                                                className={styles.trainLineIndicator}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                            <span>{trainLine}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                        <div className={styles.totalTripDuration}>
                                            <i className="fas fa-clock"></i>
                                            <span>Total Duration: {calculateTotalDuration(trip)}</span>
                                        </div>
                                    </div>
                                    <div className={styles.tripLegs}>
                                        {(() => {
                                            // Group the trip items into legs
                                            const legs: string[][] = [];
                                            let currentLeg: string[] = [];
                                            
                                            trip.forEach((info) => {
                                                if (info.startsWith('From:') && currentLeg.length > 0) {
                                                    legs.push([...currentLeg]);
                                                    currentLeg = [];
                                                }
                                                currentLeg.push(info);
                                            });
                                            if (currentLeg.length > 0) {
                                                legs.push(currentLeg);
                                            }

                                            return legs.map((leg, legIndex) => (
                                                <Fragment key={legIndex}>
                                                    <div 
                                                        className={styles.tripLeg}
                                                        style={{ '--line-color': getTrainLineColor(extractTrainLine(leg.find(info => info.startsWith('On:'))?.replace('On: ', '') || '')) } as React.CSSProperties}
                                                    >
                                                        {leg.map((info, infoIndex) => {
                                                            if (info.startsWith('On:')) return null;
                                                            
                                                            const formattedInfo = formatTripInfo(info);
                                                            if (!formattedInfo) return null;

                                                            const isLastItem = infoIndex === leg.length - 1;
                                                            return (
                                                                <div key={infoIndex} className={styles.tripItem}>
                                                                    {formattedInfo}
                                                                    {isLastItem && (
                                                                        <div className={styles.trainLine}>
                                                                            {extractTrainLine(leg.find(info => info.startsWith('On:'))?.replace('On: ', '') || '')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {legIndex < legs.length - 1 && (
                                                        <div className={styles.tripLegSeparator}>
                                                            <div className={styles.tripLegDivider} />
                                                            {(() => {
                                                                const waitTime = calculateWaitingTime(leg, legs[legIndex + 1]);
                                                                return waitTime && (
                                                                    <div className={styles.waitTimeIndicator}>
                                                                        {formatMinutesToTime(waitTime)}
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className={styles.tripLegDivider} />
                                                        </div>
                                                    )}
                                                </Fragment>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
            <Footer />
            <ScrollToTop />
        </div>
    );
}
