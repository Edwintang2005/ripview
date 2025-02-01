'use client';
import Image from "next/image";


export default function Home() {
    return (
        <div>
            <Image src='/map/sydney-trains-network-map.svg' alt='network-map' useMap="#networkMap" width={0} height={0} style={{ width: '70%', height: 'auto' }}/>
            <map name='networkMap'></map>
        </div>
    );
}