import styles from './SubHeader.module.css';
import BackButton from './BackButton';

interface SubHeaderProps {
    timeInfo: string;
    onClosestTrip?: () => void;
    hasClosestTrip?: boolean;
}

export default function SubHeader({ timeInfo, onClosestTrip, hasClosestTrip }: SubHeaderProps) {
    return (
        <div className={styles.subHeader}>
            <div className={styles.content}>
                <div className={styles.leftSection}>
                    <BackButton />
                    <span className={styles.timeInfo}>{timeInfo}</span>
                </div>
                {hasClosestTrip && onClosestTrip && (
                    <div className={styles.rightSection}>
                        <button 
                            onClick={onClosestTrip}
                            className={styles.closestTripButton}
                            aria-label="Go to closest trip"
                        >
                            <span className={styles.desktopText}>Go to Closest Trip</span>
                            <span className={styles.mobileText}>Closest Trip</span>
                            <i className="fas fa-arrow-right" aria-hidden="true"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
