'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './ScrollToTop.module.css';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // Debounced scroll handler
    const toggleVisibility = useCallback(() => {
        let scrollTimeout: NodeJS.Timeout;

        return () => {
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            // Clear the timeout if it exists
            clearTimeout(scrollTimeout);

            // Set a new timeout
            scrollTimeout = setTimeout(() => {
                if (scrollPosition > 300) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            }, 100); // 100ms delay for smoother transition
        };
    }, []);

    // Smooth scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        // Wait for DOM to be fully loaded
        if (typeof window !== 'undefined') {
            const handleScroll = toggleVisibility();
            window.addEventListener('scroll', handleScroll);

            // Cleanup
            return () => {
                window.removeEventListener('scroll', handleScroll);
            };
        }
    }, [toggleVisibility]);

    return (
        <button
            className={`${styles.scrollToTop} ${isVisible ? styles.visible : ''}`}
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            <i className={`fas fa-arrow-up ${styles.icon}`} style={{ color: 'inherit' }}></i>
        </button>
    );
}
