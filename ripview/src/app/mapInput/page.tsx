'use client';
import styles from './mapInput.module.css';
import MySVG from '../../../public/map/Sydney_Trains_Network_Map.svg';
import { useCallback, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useState } from 'react';

export default function MapInput() {
    const router = useRouter();
    let fromId = '';
    let toId = '';
    const [viewBox, setViewBox] = useState('0 0 800 800');

    const zoom = (factor: number) => {
        setViewBox((prev: string) => {
            const [x, y, w, h] = prev.split(' ').map(Number);
            const zoomFactor = w * factor; // Adjust width/height
            const newW = Math.max(10, w + zoomFactor);
            const newH = Math.max(10, h + zoomFactor);
            return `${x} ${y} ${newW} ${newH}`;
        });
    };
    const left = (num: number) => {
        setViewBox((prev: string) => {
            const [x, y, w, h] = prev.split(' ').map(Number);
            const newX = x - num;
            return `${newX} ${y} ${w} ${h}`;
        });
    };
    const right = (num: number) => {
        setViewBox((prev: string) => {
            const [x, y, w, h] = prev.split(' ').map(Number);
            const newX = x + num;
            return `${newX} ${y} ${w} ${h}`;
        });
    };
    const up = (num: number) => {
        setViewBox((prev: string) => {
            const [x, y, w, h] = prev.split(' ').map(Number);
            const newY = y - num;
            return `${x} ${newY} ${w} ${h}`;
        });
    };
    const down = (num: number) => {
        setViewBox((prev: string) => {
            const [x, y, w, h] = prev.split(' ').map(Number);
            const newY = y + num;
            return `${x} ${newY} ${w} ${h}`;
        });
    };
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
        <div className={styles.page}>
            <Header text='Home' link='/'/>
            <main className={styles.main}>
                <div className={styles.zoomButtons}>
                    Zoom:
                    <button onClick={() => zoom(-0.1)}>+</button>
                    <button onClick={() => zoom(0.1)}>-</button>
                </div>
                <div className={styles.panButtons}>
                    Pan:
                    <button onClick={() => up(15)}>↑</button>
                    <div>
                        <button onClick={() => left(15)}>←</button>
                        <button onClick={() => right(15)}>→</button>
                    </div>
                    <button onClick={() => down(15)}>↓</button>
                </div>
                <MySVG className={styles.map}
                    viewBox={viewBox}
                    onClick={handleSVGClick}
                />
            </main>
        </div>
    );
}
