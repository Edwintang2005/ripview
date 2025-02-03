import Image from 'next/image';
import styles from './Header.module.css';

export default function Header() {
    return (
        <div className={styles.navBar}>
            <Image
                className={styles.lightLogo}
                src='/favicon/favicon.svg'
                alt='RipView logo'
                width={180}
                height={38}
                priority
            />
            <h1>RipView</h1>
        </div>
    );
}
