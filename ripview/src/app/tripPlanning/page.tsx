'use client';

import { useSearchParams } from 'next/navigation';
import { FetchtripData } from '../api/apiCalls';
import { useState, useEffect } from 'react';

export default function Home() {
    const [jsonData, setjsonData] = useState([['Loading...']]);
    const searchParams = useSearchParams();
    const fromStation = searchParams.get('fromStations');
    const toStation = searchParams.get('toStations');
    useEffect(() => {
        async function fetchPosts() {
            const tripData = {
                fromStation: fromStation as string,
                toStation: toStation as string,
            };
            const data = await FetchtripData(tripData);
            setjsonData(data);
        }
        fetchPosts();
    }, [fromStation, toStation]);
    console.log(jsonData);
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
