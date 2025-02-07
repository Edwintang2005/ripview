'use client';

import { useSearchParams } from 'next/navigation';
import { FetchtripData } from '../api/apiCalls';
import { useState, useEffect } from 'react';
import { getStationNameFromId } from '@/utils/getData';
import trainLineColours from '@/config/trainLineColours';
import styles from './tripPlanning.module.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import BackButton from '@/components/BackButton';

export default function Home() {
    const [jsonData, setjsonData] = useState([['Loading...']]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const searchParams = useSearchParams();
    const fromStation = searchParams.get('fromStations');
    const toStation = searchParams.get('toStations');
    const isArr = searchParams.get('depOrArr')?.includes('arr');
    const timePreference = searchParams.get('timePreference');
    const time = searchParams.get('time');

    const fromName = getStationNameFromId(fromStation as string);
    const toName = getStationNameFromId(toStation as string);
    const [expandedTrip, setExpandedTrip] = useState<number | null>(null);

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
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

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

                    const depTimeMatch = departureInfo.match(/From: .+\. Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                    if (!depTimeMatch) return false;

                    const depTimeStr = depTimeMatch[1];
                    const [depDatePart, depTimePart] = depTimeStr.split(', ');
                    if (!depDatePart || !depTimePart) return false;

                    const [depDay, depMonth, depYear] = depDatePart.split('/').map(Number);
                    const [depHour, depMinute] = depTimePart.split(':').map(Number);
                    const departureTime = new Date(depYear, depMonth - 1, depDay, depHour, depMinute);

                    if (departureTime <= now) return false;

                    const arrivalInfo = trip.find(info => info.startsWith('To:'));
                    if (!arrivalInfo) return false;

                    const timeMatch = arrivalInfo.match(/To: .+\. Arriving at (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                    if (!timeMatch) return false;

                    const timeStr = timeMatch[1];
                    const [arrDatePart, arrTimePart] = timeStr.split(', ');
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
                    setjsonData(filterTrips(data));
                } catch (error) {
                    setjsonData([['Error fetching trip data']]);
                }
            }
        };
        fetchData();
    }, [fromStation, toStation, time, isArr, date, timeValue]);

    // Function to check if the trip has multiple legs
    const hasMultipleLegs = (trip: string[]) => {
        return trip.filter((info) => info.startsWith('From:')).length > 1;
    };

    // Function to get the number of legs in the trip
    const getNumberOfLegs = (trip: string[]) => {
        return trip.filter((info) => info.startsWith('From:')).length;
    };

    // Function to format station name consistently
    const formatStationName = (fullName: string | undefined) => {
        if (!fullName) return '';
        const match = fullName.match(/(?:From: |To: )?([^,]+?)(?:\s+Station)?(?:,\s*Platform\s*(\d+))/i);
        if (match) {
            const [_, station, platform] = match;
            return `${station}${platform ? `, Platform ${platform}` : ''}`;
        }
        return fullName.replace(/^(?:From:|To:)\s*/, '').trim();
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

        // First close the current tab and immediately open the new one
        setExpandedTrip(null);
        setTimeout(() => {
            setExpandedTrip(tripIndex);
            
            // After opening, scroll to the new position
            setTimeout(() => {
                const tripElement = document.getElementById(`trip-main-${tripIndex}`);
                if (tripElement) {
                    const computedStyle = getComputedStyle(document.documentElement);
                    const headerOffset = parseInt(computedStyle.getPropertyValue('--header-offset')) || 200;
                    const elementPosition = tripElement.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({
                        top: elementPosition - headerOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }, 300);
    };

    // Function to format time without seconds
    const formatTimeWithoutSeconds = (timeStr: string) => {
        if (!timeStr) return 'N/A';
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    };

    // Function to calculate total duration from multiple legs
    const calculateTotalDuration = (trip: string[]) => {
        let totalMinutes = 0;
        let lastArrivalTime: Date | null = null;

        // Group the trip information into legs
        const legs = trip.reduce((acc: string[][], info: string) => {
            if (info.startsWith('From:')) {
                acc.push([info]);
            } else if (acc.length > 0) {
                acc[acc.length - 1].push(info);
            }
            return acc;
        }, []);

        for (const leg of legs) {
            // Extract departure and arrival times for this leg
            const departureInfo = leg.find(info => info.startsWith('From:'));
            const arrivalInfo = leg.find(info => info.startsWith('To:'));

            if (departureInfo && arrivalInfo) {
                const depMatch = departureInfo.match(/Departing at: (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);
                const arrMatch = arrivalInfo.match(/Arriving at (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/);

                if (depMatch && arrMatch) {
                    const depTime = new Date(depMatch[1].replace(/, /, ' '));
                    const arrTime = new Date(arrMatch[1].replace(/, /, ' '));

                    // Add waiting time from previous leg if exists
                    if (lastArrivalTime) {
                        const waitingTime = Math.round((depTime.getTime() - lastArrivalTime.getTime()) / (1000 * 60));
                        totalMinutes += waitingTime;
                    }

                    // Add travel time for current leg
                    const travelTime = Math.round((arrTime.getTime() - depTime.getTime()) / (1000 * 60));
                    totalMinutes += travelTime;

                    lastArrivalTime = arrTime;
                }
            }
        }

        if (totalMinutes < 60) {
            return `${totalMinutes}m`;
        } else {
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            return `${hours}h ${mins}m`;
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
        if (info.startsWith('On:')) {
            return (
                <div className={styles.trainLine}>
                    {info.replace('On: Sydney Trains Network', '').trim()}
                </div>
            );
        }
        return null;
    };

    const calculateTimeUntilDeparture = (departureTimeStr: string) => {
        if (!departureTimeStr || !time) return null;
        
        const [datePart, timePart] = departureTimeStr.trim().split(', ');
        if (!datePart || !timePart) return null;

        // Parse the full departure date and time
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const departureTime = new Date(
            year,
            month - 1,
            day,
            hours,
            minutes
        );

        // Get current time
        const now = new Date();
        
        // Calculate difference in minutes
        const diffMs = departureTime.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / (1000 * 60));

        // If departure time is in the past
        if (diffMins < 0) {
            const minsAgo = Math.abs(diffMins);
            if (minsAgo < 60) {
                return `${minsAgo}m ago`;
            } else {
                const hours = Math.floor(minsAgo / 60);
                const mins = minsAgo % 60;
                return `${hours}h ${mins}m ago`;
            }
        }
        
        if (diffMins < 60) {
            return `${diffMins}m`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    };

    const calculateArrivalDifference = (actualArrivalStr: string, targetArrivalStr: string) => {
        if (!actualArrivalStr || !targetArrivalStr) return null;

        try {
            let targetDate: Date;
            if (targetArrivalStr.includes('T')) {
                targetDate = new Date(targetArrivalStr);
            } else {
                const [datePart, timePart] = targetArrivalStr.trim().split(', ');
                if (!datePart || !timePart) return null;
                const [day, month, year] = datePart.split('/').map(Number);
                const [hours, minutes] = timePart.split(':').map(Number);
                targetDate = new Date(year, month - 1, day, hours, minutes);
            }

            const [actualDatePart, actualTimePart] = actualArrivalStr.trim().split(', ');
            if (!actualDatePart || !actualTimePart) return null;
            const [actualDay, actualMonth, actualYear] = actualDatePart.split('/').map(Number);
            const [actualHours, actualMinutes] = actualTimePart.split(':').map(Number);
            const actualDate = new Date(actualYear, actualMonth - 1, actualDay, actualHours, actualMinutes);

            const diffMs = targetDate.getTime() - actualDate.getTime();
            const diffMins = Math.round(diffMs / (1000 * 60));

            return diffMins;
        } catch (error) {
            return null;
        }
    };

    const formatTimeDifference = (diffMins: number) => {
        const absDiff = Math.abs(diffMins);
        if (absDiff < 60) {
            return `${absDiff}m`;
        } else {
            const hours = Math.floor(absDiff / 60);
            const mins = absDiff % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
    };

    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <BackButton />
                <div className={styles.tripContent}>
                    <div className={styles.tripHeading}>
                        <h1 className={styles.pageTitle}>
                            Trip From {fromName} to {toName}!
                        </h1>
                        <p className={styles.timePreferenceText}>{getTimePreferenceText()}</p>
                    </div>
                    <div className={styles.tripDetails}>
                        <p>Showing trips for: {getTimePreferenceText()}</p>
                    </div>
                    {jsonData.map((trip, tripIndex) => {
                        // Extract departure and arrival info
                        const departureInfos = trip.filter(info => info.startsWith('From:'));
                        const arrivalInfos = trip.filter(info => info.startsWith('To:'));
                        
                        // Get the first departure and last arrival for multi-leg journeys
                        const firstDepartureInfo = departureInfos[0]?.split('Departing at:');
                        const lastArrivalInfo = arrivalInfos[arrivalInfos.length - 1]?.split('Arriving at');
                        
                        const transportInfo = trip.find(info => info.startsWith('On:'))?.replace('On: ', '');
                        const durationInfo = trip.find(info => info.startsWith('Duration:'))?.replace('Duration: ', '');

                        return (
                            <div
                                key={tripIndex}
                                id={`trip-${tripIndex}`}
                                className={`${styles.tripOption} ${expandedTrip === tripIndex ? styles.expanded : ''}`}
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
                                                Departs at {formatTimeWithoutSeconds(firstDepartureInfo?.[1].trim().split(', ')[1] || 'N/A')}
                                            </div>
                                            {hasMultipleLegs(trip) && (
                                                <div className={styles.legsInfo}>
                                                    {getNumberOfLegs(trip) - 1} train line change{getNumberOfLegs(trip) - 1 > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.rightSection}>
                                        <div className={`${styles.stationContainer} ${styles.right}`}>
                                            <div className={styles.stationName}>
                                                {formatStationName(lastArrivalInfo?.[0])}
                                            </div>
                                            <div className={styles.stationTime}>
                                                Arrives at {formatTimeWithoutSeconds(lastArrivalInfo?.[1]?.trim().split(', ')[1] || 'N/A')}
                                                {isArr && lastArrivalInfo?.[1] && time && (() => {
                                                    const arrivalTime = lastArrivalInfo[1];
                                                    if (!arrivalTime) return null;
                                                    
                                                    const diffMins = calculateArrivalDifference(arrivalTime, time);
                                                    if (diffMins !== null) {
                                                        return (
                                                            <div className={styles.arrivalDifference}>
                                                                ({diffMins > 0 ? `${formatTimeDifference(diffMins)} before` : `${formatTimeDifference(Math.abs(diffMins))} after`} requested time)
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
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
                                    <ul className={styles.tripList}>
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

                                            return legs.map((leg, legIndex) => {
                                                const trainLineInfo = leg.find(info => info.startsWith('On:'));
                                                const trainLine = trainLineInfo ? extractTrainLine(trainLineInfo.replace('On: ', '')) : '';
                                                const lineColor = getTrainLineColor(trainLine);

                                                return (
                                                    <li key={legIndex} className={styles.legGroup}>
                                                        {legIndex > 0 && <hr className={styles.legDivider} />}
                                                        <div className={styles.legContent} style={{ '--line-color': lineColor } as React.CSSProperties}>
                                                            {leg.map((info, infoIndex) => {
                                                                if (info.startsWith('On:')) return null;
                                                                
                                                                const formattedInfo = formatTripInfo(info);
                                                                if (!formattedInfo) return null;

                                                                if (info.startsWith('From:')) {
                                                                    return (
                                                                        <div key={infoIndex} className={styles.tripItem}>
                                                                            {formattedInfo}
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div key={infoIndex} className={styles.tripItem}>
                                                                        {formattedInfo}
                                                                        {info.startsWith('Duration:') && (
                                                                            <div className={styles.trainLine}>
                                                                                {trainLine}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </li>
                                                );
                                            });
                                        })()}
                                    </ul>
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
