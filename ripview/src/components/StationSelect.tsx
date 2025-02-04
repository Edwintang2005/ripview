'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './StationSelect.module.css';

interface StationSelectProps {
    label: string;
    name: string;
    onChange: (value: string) => void;
    records: (string | number)[][];
}

export default function StationSelect({ label, name, onChange, records }: StationSelectProps) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [filteredStations, setFilteredStations] = useState<(string | number)[][]>(records);
    const [selectedId, setSelectedId] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter stations based on input
    useEffect(() => {
        const filtered = records.filter(station =>
            String(station[1]).toLowerCase().includes(inputValue.toLowerCase())
        );
        setFilteredStations(filtered);
    }, [inputValue, records]);

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
            const firstMatch = filteredStations[0];
            setInputValue(String(firstMatch[1]));
            setSelectedId(String(firstMatch[2]));
            onChange(String(firstMatch[2]));
            setIsOpen(false);
        }
    };

    // Handle station selection
    const handleStationSelect = (station: (string | number)[]) => {
        const stationId = String(station[2]);
        setInputValue(String(station[1]));
        setSelectedId(stationId);
        onChange(stationId);
        setIsOpen(false);
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
                            key={String(station[2])}
                            onClick={() => handleStationSelect(station)}
                        >
                            {String(station[1])}
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
                value={selectedId}
            />
        </div>
    );
} 