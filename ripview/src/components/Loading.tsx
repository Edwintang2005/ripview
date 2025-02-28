'use client';

import styles from './Loading.module.css';

interface LoadingProps {
    message?: string;
}

export default function Loading({ message = 'Loading...' }: LoadingProps) {
    return (
        <div className={styles.loadingContainer}>
            <div className={styles.loadingContent}>
                <div className={styles.loadingAnimation}>
                    <div className={styles.train}>
                        <i className="fas fa-train" aria-hidden="true"></i>
                    </div>
                    <div className={styles.track}>
                        {Array.from({ length: 15 }, (_, i) => (
                            <span key={i} className={styles.dot}>.</span>
                        ))}
                    </div>
                </div>
                <p className={styles.loadingMessage}>{message}</p>
            </div>
        </div>
    );
}
