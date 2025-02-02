'use client';
import Image from "next/image";
import styles from '../page.module.css';


export default function Home() {
    return (
        <div className={styles.mapDiv}>
            <Image src='/map/Sydney_Trains_Network_Map.svg' alt='network-map' useMap="#networkMap" width={0} height={0} style={{ width: '70%', height: 'auto' }}/>
            <map name='networkMap'></map>
        </div>
    );
}