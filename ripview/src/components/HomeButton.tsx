'use client';

import { useRouter } from 'next/navigation';
import { PAGE_PATHS } from '@/utils/navigation';
import styles from './HomeButton.module.css';

export default function HomeButton({ className = '' }: { className?: string }) {
    const router = useRouter();

    const handleHomeClick = () => {
        sessionStorage.setItem('lastPage', window.location.pathname);
        router.push(PAGE_PATHS.HOME);
    };

    return (
        <button 
            onClick={handleHomeClick}
            className={`${styles.homeButton} ${className}`}
        >
            Home
        </button>
    );
}