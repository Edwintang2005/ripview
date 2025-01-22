'use client';

import { useState } from 'react';
import React from 'react';

// Props for the CsvHandler component
interface CsvHandlerProps {
    // Callback function to be called when data is loaded
    onDataLoaded?: (data: string[][]) => void;
}

// Component that handles CSV file uploads
export default function CsvHandler({ onDataLoaded }: CsvHandlerProps) {
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Function to parse CSV content, handling commas within quoted fields
    const parseCSV = (text: string): string[][] => {
        const rows = text.split('\n');
        return rows.map((row) => {
            const cells = [];
            let currentCell = '';
            let insideQuotes = false;

            // Iterate over each character in the row so that we can handle commas within quotes
            for (let i = 0; i < row.length; i++) {
                const char = row[i];

                if (char === '"' && row[i + 1] === '"') {
                    // Handle escaped quotes
                    currentCell += '"';
                    // Skip the next quote
                    i++;
                } else if (char === '"') {
                    // Toggle insideQuotes state
                    insideQuotes = !insideQuotes;
                } else if (char === ',' && !insideQuotes) {
                    // End of a cell
                    cells.push(currentCell);
                    currentCell = '';
                } else {
                    // Regular character
                    currentCell += char;
                }
            }
            // Add the last cell
            cells.push(currentCell);

            return cells;
        });
    };

    // Function to handle file uploads
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        // Check if a file was selected
        if (!file) {
            setErrorMessage('Please select a file.');
            return;
        }

        // Check if the file is a CSV file
        if (!file.name.endsWith('.csv')) {
            setErrorMessage('Please upload a CSV file.');
            return;
        }

        // Set loading state and show "Loading..." message
        setIsLoading(true);
        // Creates a tool to read the file
        const reader = new FileReader();

        // When the file is loaded, parse the data and call the onDataLoaded callback
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target) {
                    throw new Error('File reading failed');
                }

                const result = e.target.result;
                if (typeof result !== 'string') {
                    throw new Error('File content is not text');
                }

                // Parse the CSV content
                const rows = parseCSV(result);
                if (onDataLoaded) {
                    onDataLoaded(rows);
                }
                setErrorMessage('');
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Error reading file');
            } finally {
                // Reset loading state
                setIsLoading(false);
            }
        };

        reader.onerror = () => {
            setErrorMessage('Error reading file');
            setIsLoading(false);
        };

        try {
            // Start reading the file as text
            reader.readAsText(file);
        } catch (error) {
            setErrorMessage('Error reading file');
            setIsLoading(false);
        }
    };

    // Render the file upload input
    return (
        <div>
            <input
                type="file"
                onChange={handleFileUpload}
                accept=".csv"
                style={{ marginBottom: '10px', color: 'var(--foreground)' }}
            />

            {errorMessage && (
                <div style={{ color: 'red', marginBottom: '10px' }}>
                    {errorMessage}
                </div>
            )}

            {isLoading && (
                <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--foreground)' }}>
                    Loading...
                </div>
            )}
        </div>
    );
}
