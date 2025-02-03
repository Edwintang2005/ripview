'use client';
import styles from '../page.module.css';
import MySVG from '../../../public/map/Sydney_Trains_Network_Map.svg';
import { useCallback, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
    let fromId = '';
    let toId = '';
    const handleSVGClick = useCallback((event: MouseEvent<SVGSVGElement>) => {
        let target = event.target;
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
            if (fromId == '') {
                fromId = clickedId;
            } else if (toId == '') {
                toId = clickedId;
                router.push(`/tripPlanning?fromStations=${fromId}&toStations=${toId}&timePreference=current&time=`);
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
