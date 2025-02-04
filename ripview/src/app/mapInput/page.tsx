'use client';
import styles from './mapInput.module.css';
import MySVG from '../../../public/map/Sydney_Trains_Network_Map.svg';
import { useCallback, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
    let fromId = '';
    let toId = '';
    const handleSVGClick = useCallback((event: MouseEvent<SVGSVGElement>) => {
        let target = event.target;
        const targetStore = event.target as SVGElement;
        console.log(targetStore);
        let clickedId = '';
        while (target instanceof SVGElement) {
            if (target.id) {
                clickedId = target.id;
                break;
            }
            // If the parent node is an SVG element, continue traversing up
            const parentNode = target.parentNode;
            // Check if the parent is an SVG element (to avoid going beyond the SVG)
            if (parentNode instanceof SVGElement) {
                target = parentNode;
            } else {
                // If we're not in an SVG anymore, break the loop
                break;
            }
        }
        console.log('Clicked ID:', clickedId);
        clickedId = clickedId.replace(/[^0-9.]+/g, '');
        if (clickedId !== '') {
            const stationGroup = (target as SVGElement).closest('g');
            if (stationGroup) {
                const circle = stationGroup.querySelector('circle');
                const path = stationGroup.querySelector('path');
                if (fromId === '') {
                    fromId = clickedId;
                    if (circle) circle.style.fill = '#00ff00';
                    if (path) path.style.fill = '#00ff00';
                } else if (toId === '' && clickedId !== fromId) {
                    toId = clickedId;
                    if (circle) circle.style.fill = '#00ff00';
                    if (path) path.style.fill = '#00ff00';
                    router.push(`/tripPlanning?fromStations=${fromId}&toStations=${toId}&timePreference=current&time=`);
                }
            }
        }
    }, []);
    return (
        <div className={styles.mapDiv} >
            <MySVG
                onClick={handleSVGClick}
            />
        </div>
    );
}
