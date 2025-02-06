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

    // Format the datetime for display
    const formatDateTime = (dateTimeStr: string) => {
        const dt = new Date(dateTimeStr);
        console.log('Formatting datetime:', {
            input: dateTimeStr,
            parsed: dt,
            formatted: dt.toLocaleString('en-AU', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Australia/Sydney'
            })
        });

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
        if (!time) return 'Current time';
        const searchTime = new Date(time);
        return `${timePreference === 'current' ? 'Current time' : 'Specific time'} (${searchTime.getHours().toString().padStart(2, '0')}:${searchTime.getMinutes().toString().padStart(2, '0')})`;
    };

    const getCurrentDateTime = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const dtime = searchParams.get('time') || getCurrentDateTime();
    const date = dtime.split('T')[0].replaceAll('-', '');
    const timeValue = dtime.split('T')[1].replace(':', '');

    useEffect(() => {
        async function fetchPosts() {
            const tripData = {
                fromStation: fromStation as string,
                toStation: toStation as string,
                isArr: isArr as boolean,
                date: date,
                time: timeValue
            };
            let data = await FetchtripData(tripData);

            // Add filtering for "Arrive by" trips
            if (isArr && data && data.length > 0) {
                const requestedDateTime = new Date(time!);

                data = data.filter(trip => {
                    const arrivalInfo = trip.find(info => info.includes('Arriving at'));
                    if (arrivalInfo) {
                        const timeStr = arrivalInfo.split('Arriving at')[1].trim();
                        const [datePart, timePart] = timeStr.split(', ');
                        const [day, month, year] = datePart.split('/');
                        const [hours, minutes] = timePart.split(':');

                        // Create Date object for arrival time
                        const arrivalDateTime = new Date(
                            parseInt(year),
                            parseInt(month) - 1, // Months are 0-based
                            parseInt(day),
                            parseInt(hours),
                            parseInt(minutes)
                        );

                        return arrivalDateTime <= requestedDateTime;
                    }
                    return false;
                });

                if (data.length === 0) {
                    data = [['No trips found that arrive before or at your requested time.']];
                }
            }

            setjsonData(data);
        }
        fetchPosts();
    }, [fromStation, toStation, isArr, date, time, timeValue]);

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
            return `${station}, Platform ${platform}`;
        }
        return fullName.replace(/^(?:From:|To:)\s*/, '').trim();
    };

    // Function to format the trip information
    const formatTripInfo = (info: string) => {
        if (info.startsWith('From:')) {
            const [location, time] = info.split('Departing at:');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, ''); // Removes seconds
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
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, ''); // Removes seconds
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

    // Function to extract train line info
    const extractTrainLine = (info: string) => {
        const match = info.match(/Sydney Trains Network\s+(.+)/);
        return match ? match[1] : info;
    };

    // Function to calculate total duration from multiple legs
    const calculateTotalDuration = (trip: string[]) => {
        let totalMinutes = 0;

        // Find all duration strings in the trip
        trip.forEach(info => {
            if (info.startsWith('Duration:')) {
                const minutes = parseInt(info.replace('Duration:', ''));
                if (!isNaN(minutes)) {
                    totalMinutes += minutes;
                }
            }
        });

        if (totalMinutes === 0) return '0m';

        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        if (hours === 0) {
            return `${remainingMinutes}m`;
        }
        return `${hours}h ${remainingMinutes}m`;
    };

    // Function to format time without seconds
    const formatTimeWithoutSeconds = (timeStr: string) => {
        if (!timeStr) return 'N/A';
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    };

    // Function to get train line color
    const getTrainLineColor = (trainLine: string) => {
        const color = Object.entries(trainLineColours).find(([key]) =>
            trainLine.includes(key)
        );
        return color ? color[1] : '#6f818d';
    };

    const calculateTimeUntilDeparture = (departureTimeStr: string) => {
        if (!departureTimeStr || !time) return null;
        
        const [datePart, timePart] = departureTimeStr.trim().split(', ');
        if (!datePart || !timePart) return null;

        // Extract just the time parts
        const departureTimeParts = timePart.split(':');
        const searchTime = new Date(time);
        
        // Create new dates with today's date but with the respective times
        const today = new Date();
        const departureTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
            parseInt(departureTimeParts[0]), 
            parseInt(departureTimeParts[1])
        );
        const searchTimeToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
            searchTime.getHours(),
            searchTime.getMinutes()
        );
        
        // Calculate difference in minutes
        const diffMs = departureTime.getTime() - searchTimeToday.getTime();
        if (diffMs < 0) return null;
        
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 60) {
            return `${diffMins}m`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    };

    const handleTripClick = (tripIndex: number) => {
        // If clicking the same trip, just close it
        if (expandedTrip === tripIndex) {
            setExpandedTrip(null);
            return;
        }

        // First close the current tab
        setExpandedTrip(null);

        // Wait for close animation
        setTimeout(() => {
            const tripElement = document.getElementById(`trip-main-${tripIndex}`);
            if (tripElement) {
                // Get the computed header offset from CSS
                const computedStyle = getComputedStyle(document.documentElement);
                const headerOffset = parseInt(computedStyle.getPropertyValue('--header-offset')) || 170;
                const elementPosition = tripElement.getBoundingClientRect().top + window.pageYOffset;
                
                window.scrollTo({
                    top: elementPosition - headerOffset,
                    behavior: 'smooth'
                });

                // Wait for scroll to complete before opening new tab
                setTimeout(() => {
                    setExpandedTrip(tripIndex);
                });
            }
        }, 300);
    };

    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <BackButton />
                <div className={styles.tripContent}>
                    <h1 className={styles.pageTitle}>
                        Trip From {fromName} to {toName}!
                    </h1>
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
                                                {formatTimeWithoutSeconds(firstDepartureInfo?.[1].trim().split(', ')[1] || 'N/A')}
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
                                                {formatTimeWithoutSeconds(lastArrivalInfo?.[1].trim().split(', ')[1] || 'N/A')}
                                            </div>
                                        </div>
                                        <div className={styles.tripStatusSection}>
                                            <div className={styles.tripInfoBox}>
                                                {(() => {
                                                    const timeUntil = firstDepartureInfo?.[1] ? calculateTimeUntilDeparture(firstDepartureInfo[1]) : null;
                                                    return (
                                                        <>
                                                            {timeUntil && (
                                                                <div className={styles.timeUntilDeparture}>
                                                                    Departs in: {timeUntil}
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
