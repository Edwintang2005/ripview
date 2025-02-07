import Image from 'next/image';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';

interface headerProps {
    text: string;
    link: string;
}

export default function Header(props: headerProps) {
    const text = props.text;
    const link = props.link;
    const router = useRouter();
    return (
        <div className={styles.navBar}>
            <Image
                className={styles.lightLogo}
                src='/favicon/favicon.svg'
                alt='RipView logo'
                width={38}
                height={38}
                priority
            />
            <h1>RipView</h1>
            <button className={styles.mapButton} onClick={() => router.push(link)}>
                {text}
            </button>
        </div>
    );
}
