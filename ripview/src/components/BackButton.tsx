'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './BackButton.module.css';

interface BackButtonProps {
    fallbackPath?: string;
    className?: string;
}

export default function BackButton({ fallbackPath = '/', className = '' }: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        const lastPage = sessionStorage.getItem('lastPage');

        if (lastPage) {
            router.back();
        } else {
            router.push(fallbackPath);
        }
    };

    useEffect(() => {
        const handleBeforeUnload = () => {
            const currentPage = window.location.pathname;
            sessionStorage.setItem('lastPage', currentPage);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    return (
        <button
            onClick={handleBack}
            className={`${styles.backButton} ${className}`}
            aria-label="Go back"
        >
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            <span className={styles.srOnly}>Back</span>
        </button>
    );
}