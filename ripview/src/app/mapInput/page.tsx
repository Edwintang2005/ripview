'use client';
import styles from '../page.module.css';
import MySVG from '../../../public/map/Sydney_Trains_Network_Map.svg';


export default function Home() {
    return (
        <div className={styles.mapDiv}>
            <MySVG/>
        </div>
    );
}