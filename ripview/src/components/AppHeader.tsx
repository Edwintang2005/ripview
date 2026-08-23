'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
    /** Shown instead of the app name on a sub-page. */
    title?: string;
    /** Renders a back control. Uses history when possible, else this path. */
    backTo?: string;
}

const NAV_ITEMS = [
    { href: '/', label: 'Plan' },
    { href: '/departures', label: 'Departures' },
    { href: '/map', label: 'Map' },
];

/**
 * The app bar.
 *
 * Replaces the previous `Header`, which centred its title with
 * `position: absolute; left: 50%` (so a long title overlapped the buttons),
 * declared only `position: -webkit-sticky` (so it was not sticky in Firefox),
 * and hardcoded two heights behind `display-mode` media queries to clear the
 * iOS notch. Safe-area insets handle that properly here, and the height is a
 * single token the page padding also reads.
 */
export default function AppHeader({ title, backTo }: AppHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const goBack = () => {
        // `history.length > 1` means there is somewhere to go back to within
        // this tab. Opened cold from a home-screen shortcut, there is not.
        if (window.history.length > 1) {
            router.back();
        } else if (backTo) {
            router.push(backTo);
        } else {
            router.push('/');
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.bar}>
                {backTo
                    ? <button
                        type='button'
                        className={styles.iconButton}
                        onClick={goBack}
                        aria-label='Go back'
                    >
                        <span aria-hidden='true'>‹</span>
                    </button>
                    : <Link className={styles.brand} href='/'>
                        <Image
                            src='/favicon/favicon.svg'
                            alt=''
                            width={26}
                            height={26}
                            priority
                        />
                        <span className={styles.brandName}>RipView</span>
                    </Link>}

                {title && <h1 className={styles.title}>{title}</h1>}

                <nav className={styles.nav} aria-label='Main'>
                    {NAV_ITEMS.map((item) => {
                        const isCurrent =
                            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${isCurrent ? styles.navLinkCurrent : ''}`}
                                aria-current={isCurrent ? 'page' : undefined}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
