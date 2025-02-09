import Image from 'next/image';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    title?: string;
}

export default function Header({ title = 'RipView' }: HeaderProps) {
    const router = useRouter();
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
            <h1>{title}</h1>
            <button className={styles.mapButton} onClick={() => router.push('/mapInput')}>
                Map
            </button>
        </div>
    );
}
