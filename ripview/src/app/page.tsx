'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Image from 'next/image';
import Form from 'next/form';
import StationJson from './data/stationsInformation.json';

function Header() {
    return (
        <div className={styles.navBar}>
            <Image
                className={styles.lightLogo}
                src='/favicon/favicon.svg'
                alt='RipView logo'
                width={180}
                height={38}
                priority
            />
            <h1>RipView</h1>
        </div>
    );
}

export default function Home() {
    const router = useRouter();

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

    let records = StationJson.records;
    records = records.filter((a) => /Train|Metro/.test((a[10] as string)));

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

    const getCurrentDateTime = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <Header></Header>
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
                                    <option key={post[2]} value={post[2] + '~' + post[1]}>{post[1]}</option>
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
                                    <option key={post[2]} value={post[2] + '~' + post[1]}>{post[1]}</option>
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

                        {/* Hidden input for current time */}
                        <input
                            type='hidden'
                            name='time'
                            value={getCurrentDateTime()}
                        />

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
                                        defaultValue={getCurrentDateTime()}
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
            <footer className={styles.footer}>
                <a
                    href='https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <Image
                        aria-hidden
                        src='/file.svg'
                        alt='File icon'
                        width={16}
                        height={16}
                    />
                    Learn
                </a>
                <a
                    href='https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <Image
                        aria-hidden
                        src='/window.svg'
                        alt='Window icon'
                        width={16}
                        height={16}
                    />
                    Examples
                </a>
                <a
                    href='https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <Image
                        aria-hidden
                        src='/globe.svg'
                        alt='Globe icon'
                        width={16}
                        height={16}
                    />
                    Go to nextjs.org →
                </a>
            </footer>
        </div>
    );
}
