'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Form from 'next/form';
import { getStationIdEntries } from '@/utils/getData';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

    const records = getStationIdEntries();

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

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <Header />
                <h2>Plan a trip!!</h2>
                <Form action='/tripPlanning'>
                    <div className={styles.listInput}>
                        <label>
                            <span>From:</span>
                            <select
                                name='fromStations'
                                id='fromStations'
                                onChange={(e) => setSelectedStation(e.target.value)}
                            >
                                <option key={null} defaultValue={'---'}>{'---'}</option>
                                {records.map((post) => (
                                    <option key={post[2]} value={post[2]}>{post[1]}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className={styles.listInput}>
                        <label>
                            <span>To:</span>
                            <select
                                name='toStations'
                                id='toStations'
                                onChange={(e) => setSelectedStation(e.target.value)}
                            >
                                <option key={null} defaultValue={'---'}>{'---'}</option>
                                {records.map((post) => (
                                    <option key={post[2]} value={post[2]}>{post[1]}</option>
                                ))}
                            </select>
                        </label>
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
