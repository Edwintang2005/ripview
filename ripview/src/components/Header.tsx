import Image from 'next/image';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';

export default function Header() {
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
            <h1>RipView</h1>
            <button onClick={() => router.push('/mapInput')}> Map </button>
        </div>
    );
}
