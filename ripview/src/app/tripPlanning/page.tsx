'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { FetchtripData } from '../api/apiCalls';
import { useState, useEffect } from 'react';
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

    const router = useRouter();

    useEffect(() => {

        async function fetchPosts() {
            const tripData = {
                fromStation: fromStation?.split('~')[0] as string,
                toStation: toStation?.split('~')[0] as string,
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
    }, [fromStation, toStation, isArr, date, time]);

    // Function to check if the trip has multiple legs
    const hasMultipleLegs = (trip: string[]) => {
        return trip.filter((info) => info.startsWith('From:')).length > 1;
    };

    // Function to get the number of legs in the trip
    const getNumberOfLegs = (trip: string[]) => {
        return trip.filter((info) => info.startsWith('From:')).length;
    }

    // Function to format the trip information
    const formatTripInfo = (info: string) => {
        if (info.startsWith('From:')) {
            const [location, time] = info.split('Departing at:');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, ''); // Removes seconds
            return (
                <>
                    <div>{location.trim()}</div>
                    <div className={styles.timeInfo}>
                        Departing at: {formattedTime}
                    </div>
                </>
            );
        }
        if (info.startsWith('To:')) {
            const [location, time] = info.split('Arriving at');
            const formattedTime = time.trim().replace(/:\d{2}(?=\s|$)/, ''); // Removes seconds
            return (
                <>
                    <div>{location.trim()}</div>
                    <div className={styles.timeInfo}>
                        Arriving at: {formattedTime}
                    </div>
                </>
            );
        }
        return <div>{info}</div>;
    };

    const handleTripClick = (tripIndex: number) => {
        sessionStorage.setItem('lastPage', window.location.pathname + window.location.search);
        router.push(`/tripPlanning/trip/${tripIndex}`);
    };

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.main}>
                <BackButton />
                <div className={styles.tripContent}>
                    <h1 className={styles.pageTitle}>
                        Trip From {fromStation?.split('~')[1]} to {toStation?.split('~')[1]}!
                    </h1>
                    <div className={styles.tripDetails}>
                        <p>Showing trips for: {getTimePreferenceText()}</p>
                    </div>
                    {jsonData.map((trip, tripIndex) => (
                        <div
                            key={tripIndex}
                            className={`${styles.tripOption} ${styles.clickable}`}
                            onClick={() => handleTripClick(tripIndex)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleTripClick(tripIndex);
                                }
                            }}
                        >
                            <h2>Trip Option Number {tripIndex + 1}:</h2>
                            {hasMultipleLegs(trip) && (
                                <div className={styles.legsInfo}>
                                    Requires {getNumberOfLegs(trip) - 1} train change{getNumberOfLegs(trip) - 1 > 1 ? 's' : ''}
                                </div>
                            )}
                            <ul className={styles.tripList}>
                                {trip.map((info, infoIndex) => {
                                    const isNewLeg = info.startsWith('From:') && infoIndex !== 0;
                                    const isTransportation = info.startsWith('On:');
                                    const isDuration = info.startsWith('Duration:');

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
                    ))}
                </div>
            </main>
            <Footer />
            <ScrollToTop />
        </div>
    );
}