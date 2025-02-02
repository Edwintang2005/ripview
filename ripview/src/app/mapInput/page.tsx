'use client';
import styles from '../page.module.css';
import MySVG from '../../../public/map/Sydney_Trains_Network_Map.svg';
import { useCallback } from 'react';

export default function Home() {
    const handleSVGClick = useCallback((event: { target: { id: any; }; }) => {
        console.log("Function called");
        const clickedId = event.target.id;
        console.log('Clicked ID:', clickedId);
    }, []);
    return (
        <div className={styles.mapDiv}>
            <MySVG onClick={handleSVGClick} style={{ cursor: 'pointer' }}/>
        </div>
    );
}