'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Image from 'next/image';
import Form from 'next/form';
import StationJson from './data/stationsInformation.json';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StationSelect from '@/components/StationSelect';

export default function Home() {
    const router = useRouter();

    const getCurrentDateTime = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    // Refresh the page when the back button is pressed so fonts are loaded correctly
    useEffect(() => {
        // Listen for popstate event (back button)
        window.addEventListener('popstate', () => {
            // Refresh the page
            window.location.reload();
        });

        return () => {
            // Cleanup listener
            window.removeEventListener('popstate', () => {
                window.location.reload();
            });
        };
    }, []);

    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [showDateTime, setShowDateTime] = useState(false);
    const [timePreference, setTimePreference] = useState('current');
    const [selectedDateTime, setSelectedDateTime] = useState(getCurrentDateTime());
    const [fromStation, setFromStation] = useState('');
    const [toStation, setToStation] = useState('');

    let records = StationJson.records;
    records = records.filter((a) => /Train|Metro/.test((a[10] as string)));

    // Create a list of stations with id and name
    const stations = records.map(record => ({
        id: record[2] as string,
        name: record[1] as string
    }));

    const handleTimePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === 'specific') {
            setShowDateTime(true);
            setTimePreference('specific');
        } else {
            setShowDateTime(false);
            setTimePreference('current');
        }
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        if (!fromStation || !toStation) {
            e.preventDefault();
            alert('Please select both stations');
            return;
        }
    };

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <Header />
                <h2>Plan a trip!!</h2>
                <Form action='/tripPlanning' onSubmit={handleSubmit}>
                    <div className={styles.listInput}>
                        <StationSelect
                            label="From:"
                            name="fromStations"
                            stations={stations}
                            onChange={(value) => setFromStation(value)}
                        />
                    </div>

                    <div className={styles.listInput}>
                        <StationSelect
                            label="To:"
                            name="toStations"
                            stations={stations}
                            onChange={(value) => setToStation(value)}
                        />
                    </div>

                    <div className={styles.timePreference}>
                        <div className={styles.radioGroup}>
                            <input
                                type='radio'
                                id='current'
                                name='timePreference'
                                value='current'
                                checked={timePreference === 'current'}
                                onChange={handleTimePreferenceChange}
                            />
                            <label htmlFor="current">Current time</label>

                            <input
                                type='radio'
                                id='specific'
                                name='timePreference'
                                value='specific'
                                checked={timePreference === 'specific'}
                                onChange={handleTimePreferenceChange}
                            />
                            <label htmlFor="specific">Specific time</label>
                        </div>

                        {/* Hidden input - only use current time when timePreference is 'current' */}
                        {timePreference === 'current' && (
                            <input
                                type='hidden'
                                name='time'
                                value={getCurrentDateTime()}
                            />
                        )}

                        {showDateTime && (
                            <div className={styles.timeSelection}>
                                <div className={styles.radioGroup}>
                                    <input type='radio' id='arr' name='depOrArr' value='arr' defaultChecked={true} />
                                    <label htmlFor="arr">Arrive by</label>
                                    <input type='radio' id='dep' name='depOrArr' value='dep' />
                                    <label htmlFor="dep">Depart at</label>
                                </div>
                                <div className={styles.dateTimeInput}>
                                    <input
                                        type='datetime-local'
                                        id='time'
                                        name='time'
                                        value={selectedDateTime}
                                        onChange={(e) => setSelectedDateTime(e.target.value)}
                                        step="60" // This restricts to minutes only (no seconds)
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.buttonContainer}>
                        <button type='submit' className={styles.submitButton}>
                            Find Trips
                        </button>
                    </div>
                </Form>
            </main>
            <Footer />
        </div>
    );
}
