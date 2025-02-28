import Image from 'next/image';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface HeaderProps {
    title?: ReactNode;
    text: string;
    link: string;
}

export default function Header({ title = 'RipView', text, link }: HeaderProps) {
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
            <h1>{title}</h1>
            <button className={styles.mapButton} onClick={() => router.push(link)}>
                {text}
            </button>
        </div>
    );
}
