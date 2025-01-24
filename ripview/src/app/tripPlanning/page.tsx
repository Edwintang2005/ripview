'use client';

import { useSearchParams } from 'next/navigation';
import { FetchtripData } from '../api/apiCalls';
import { useState, useEffect } from 'react';

export default function Home() {
    const [jsonData, setjsonData] = useState([['Loading...']]);
    const searchParams = useSearchParams();
    const fromStation = searchParams.get('fromStations');
    const toStation = searchParams.get('toStations');
    const isArr = searchParams.get('depOrArr')?.includes('arr');
    const dtime = searchParams.get('time') as string;
    const date = dtime.split('T')[0].replaceAll('-', '');
    const time = dtime.split('T')[1].replace(':', '');
    useEffect(() => {
        async function fetchPosts() {
            const tripData = {
                fromStation: fromStation as string,
                toStation: toStation as string,
                isArr: isArr as boolean,
                date: date,
                time: time
            };
            const data = await FetchtripData(tripData);
            setjsonData(data);
        }
        fetchPosts();
    }, [fromStation, toStation]);
    return (
        <div>
            <h1>Trip From {fromStation} to {toStation}!</h1>
            {jsonData.map((p, i) => (
                <div key={i}>
                    <h2>Trip Option Number {i + 1}:</h2>
                    <ul>
                        {p.map((post, index) => (<li key={index}>{post}</li>))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
