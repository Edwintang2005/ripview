'use client';

import { useSearchParams } from 'next/navigation';
import { planTrip } from '../apiCalls';

export default function Home() {
    const searchParams = useSearchParams();
    const fromStation = searchParams.get('fromStations');
    const toStation = searchParams.get('toStations');
    console.log(planTrip((fromStation as string), (toStation as string)));
    return (
        <h1>Trip From {fromStation} to {toStation}!</h1>
    );
}
