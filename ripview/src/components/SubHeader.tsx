import styles from './SubHeader.module.css';
import BackButton from './BackButton';

interface SubHeaderProps {
    timeInfo: string;
}

export default function SubHeader({ timeInfo }: SubHeaderProps) {
    return (
        <div className={styles.subHeader}>
            <div className={styles.content}>
                <div className={styles.leftSection}>
                    <BackButton />
                    <span className={styles.timeInfo}>{timeInfo}</span>
                </div>
            </div>
        </div>
    );
}
