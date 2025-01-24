'use client';

import { useState } from 'react';
import styles from './page.module.css';
import Image from 'next/image';
import Form from 'next/form';
import StationJson from './data/stationsInformation.json';

function Header() {
    return <div className={styles.navBar}>
        <Image
        className={styles.lightLogo}
        src='/favicon/favicon.svg'
        alt='RipView logo'
        width={180}
        height={38}
        priority
        />
        <h1>RipView</h1>
    </div>;
}

export default function Home() {
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    let records = StationJson.records;
    records = records.filter((a) => /Train|Metro/.test((a[10] as string)));

    // const handleTripPlan = async (event: FormEvent<HTMLFormElement>) => {
    //     event.preventDefault();
    //     console.log(event.target.dispatchEvent);
    //     console.log('Selected Station ID: ', selectedStation);
    // };
    console.log(selectedStation);
    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <Header></Header>
                <h2>Plan a trip!!</h2>
                <Form action='/tripPlanning'>
                    <div className= {styles.listInput}>
                        <label> From:
                            <select name='fromStations' id='fromStations' onChange={(e) => setSelectedStation(e.target.value)}>
                                <option key = {null} defaultValue={'---'}>{'---'}</option>
                                {records.map((post) => (
                                  <option key={post[2]} value={post[2] + '~' + post[1]}>{post[1]}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className={styles.listInput}>
                        <label> To:
                            <select name='toStations' id='toStations' onChange={(e) => setSelectedStation(e.target.value)}>
                                <option key = {null} defaultValue={'---'}>{'---'}</option>
                                {records.map((post) => (
                                  <option key={post[2]} value={post[2] + '~' + post[1]}>{post[1]}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className={styles.listInput}>
                        <input type='radio' id='arr' name='depOrArr' value='arr' checked={true} ></input>
                        <label htmlFor="arr">arr</label>
                        <input type='radio' id='dep' name='depOrArr' value='dep'></input>
                        <label htmlFor="dep">dep</label>
                    </div>
                    <div className={styles.listInput}>
                        <label> At:</label>
                        <input type='datetime-local' id='time' name='time'></input>
                    </div>
                    <button type='submit'>Find Trips</button>
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
