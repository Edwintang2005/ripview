'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './StationSelect.module.css';

interface Station {
    id: string;
    name: string;
}

interface StationSelectProps {
    label: string;
    name: string;
    stations: Station[];
    onChange: (value: string) => void;
}

export default function StationSelect({ label, name, stations, onChange }: StationSelectProps) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [filteredStations, setFilteredStations] = useState<Station[]>(stations);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter stations based on input
    useEffect(() => {
        const filtered = stations.filter(station =>
            station.name.toLowerCase().includes(inputValue.toLowerCase())
        );
        setFilteredStations(filtered);
    }, [inputValue, stations]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsOpen(true);
    };

    // Handle key down event to select the first match when tab is pressed
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' && filteredStations.length > 0) {
            // Don't prevent default tab behavior
            const firstMatch = filteredStations[0];
            setInputValue(firstMatch.name);
            onChange(`${firstMatch.id}~${firstMatch.name}`);
            setIsOpen(false);
        }
    };

    // Handle station selection
    const handleStationSelect = (station: Station) => {
        setInputValue(station.name);
        onChange(`${station.id}~${station.name}`);
        setIsOpen(false);
    };

    // Get the current selected station's full value (id~name format)
    const getSelectedValue = () => {
        const selectedStation = filteredStations.find(s => s.name === inputValue);
        return selectedStation ? `${selectedStation.id}~${selectedStation.name}` : '';
    };

    return (
        <div className={styles.stationSelect} ref={wrapperRef}>
            <label>
                <span>{label}</span>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Type to search stations..."
                />
            </label>
            {isOpen && (
                <ul className={styles.dropdown}>
                    {filteredStations.map((station) => (
                        <li
                            key={station.id}
                            onClick={() => handleStationSelect(station)}
                        >
                            {station.name}
                        </li>
                    ))}
                    {filteredStations.length === 0 && (
                        <li className={styles.noResults}>No stations found</li>
                    )}
                </ul>
            )}
            <input
                type="hidden"
                name={name}
                value={getSelectedValue()}
            />
        </div>
    );
} 