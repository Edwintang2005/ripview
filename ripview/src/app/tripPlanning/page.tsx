'use client';

import { useSearchParams } from 'next/navigation';
import { FetchtripData } from '../api/apiCalls';
import { useState, useEffect } from 'react';

export default function Home() {
    const [jsonData, setjsonData] = useState([""]);
    const searchParams = useSearchParams();
    let fromStation = searchParams.get('fromStations');
    let toStation = searchParams.get('toStations');
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
    }, []);
    console.log(jsonData);
    return (
        <div>
            <h1>Trip From {fromStation} to {toStation}!</h1>
            <ul>
                {jsonData.map((post, index) => (<li key={index}>{post}</li>))}
            </ul>
        </div>
    );
}
