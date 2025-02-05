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
        if (timePreference === 'current') {
            return 'Current time';
        } else {
            return isArr
                ? `Arrive by ${formatDateTime(time!)}`
                : `Depart at ${formatDateTime(time!)}`;
        }
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

    // Function to format the trip information
    const formatTripInfo = (info: string) => {
        if (info.startsWith('From:')) {
            const [location, time] = info.split('Departing at:');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, ''); // Removes seconds
            // Extract just the station name and platform
            const match = location.match(/From: (.*?), Platform (\d+)/);
            if (match) {
                const [_, station, platform] = match;
                return (
                    <>
                        <div>{`${station}, Platform ${platform}`}</div>
                        <div className={styles.timeInfo}>
                            {formattedTime}
                        </div>
                    </>
                );
            }
        }
        if (info.startsWith('To:')) {
            const [location, time] = info.split('Arriving at');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, ''); // Removes seconds
            // Extract just the station name and platform
            const match = location.match(/To: (.*?), Platform (\d+)/);
            if (match) {
                const [_, station, platform] = match;
                return (
                    <>
                        <div>{`${station}, Platform ${platform}`}</div>
                        <div className={styles.timeInfo}>
                            {formattedTime}
                        </div>
                    </>
                );
            }
        }
        if (info.startsWith('Duration:')) {
            return <div>{info}</div>;
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

    const handleTripClick = (tripIndex: number) => {
        setExpandedTrip(expandedTrip === tripIndex ? null : tripIndex);
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
                        const departureInfo = trip.find(info => info.startsWith('From:'))?.split('Departing at:');
                        const arrivalInfo = trip.find(info => info.startsWith('To:'))?.split('Arriving at');
                        const transportInfo = trip.find(info => info.startsWith('On:'))?.replace('On: ', '');
                        const durationInfo = trip.find(info => info.startsWith('Duration:'))?.replace('Duration: ', '');

                        return (
                            <div
                                key={tripIndex}
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
                                    <div className={styles.tripMainInfo}>
                                        <div className={styles.stationContainer}>
                                            <div className={styles.stationName}>
                                                {departureInfo?.[0].replace('From:', '').trim()}
                                            </div>
                                            <div className={styles.stationTime}>
                                                {formatTimeWithoutSeconds(departureInfo?.[1].trim().split(', ')[1] || 'N/A')}
                                            </div>
                                        </div>
                                        <div className={`${styles.stationContainer} ${styles.right}`}>
                                            <div className={styles.stationName}>
                                                {arrivalInfo?.[0].replace('To:', '').trim()}
                                            </div>
                                            <div className={styles.stationTime}>
                                                {formatTimeWithoutSeconds(arrivalInfo?.[1].trim().split(', ')[1] || 'N/A')}
                                            </div>
                                        </div>
                                    </div>
                                    {hasMultipleLegs(trip) && (
                                        <div className={styles.legsInfo}>
                                            {getNumberOfLegs(trip) - 1} change{getNumberOfLegs(trip) - 1 > 1 ? 's' : ''}
                                        </div>
                                    )}
                                    <div className={styles.expandIcon}>
                                        {expandedTrip === tripIndex ? '▼' : '▶'}
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
                                        {trip.map((info, infoIndex) => {
                                            const isNewLeg = info.startsWith('From:') && infoIndex !== 0;
                                            const isTransportation = info.startsWith('On:');
                                            const isDuration = info.startsWith('Duration:');

                                            if (isTransportation) return null;

                                            return (
                                                <li key={infoIndex}>
                                                    {isNewLeg && <hr className={styles.legDivider} />}
                                                    <div className={`
                                                        ${isTransportation ? styles.transportInfo : ''}
                                                        ${isDuration ? styles.durationInfo : ''}
                                                    `}>
                                                        {formatTripInfo(info)}
                                                    </div>
                                                </li>
                                            );
                                        })}
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
