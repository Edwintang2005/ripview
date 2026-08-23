import type { ReactNode } from 'react';
import styles from './Notice.module.css';

type NoticeTone = 'info' | 'error';

interface NoticeProps {
    tone?: NoticeTone;
    title: string;
    children?: ReactNode;
    /** An optional recovery action, e.g. "Try again". */
    action?: ReactNode;
}

/**
 * An explicit empty, error or informational state.
 *
 * Every data-fetching screen has one. The previous implementation had none: a
 * failed request left a permanent "Loading..." on screen, and an error
 * surfaced as the literal string 'ERROR' rendered as a trip option.
 *
 * Errors are announced assertively so a screen reader user learns the search
 * failed without having to go looking.
 */
export default function Notice({ tone = 'info', title, children, action }: NoticeProps) {
    return (
        <div
            className={`${styles.notice} ${tone === 'error' ? styles.error : ''}`}
            role={tone === 'error' ? 'alert' : 'status'}
        >
            <p className={styles.title}>{title}</p>
            {children && <div className={styles.body}>{children}</div>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}

interface LoadingProps {
    label: string;
}

/**
 * A loading placeholder that reserves the space the content will occupy, so
 * results do not shove the page around when they arrive.
 */
export function Loading({ label }: LoadingProps) {
    return (
        <div className={styles.loading} role='status' aria-live='polite'>
            <span className={styles.srOnly}>{label}</span>
            <span aria-hidden='true' className={styles.skeleton} />
            <span aria-hidden='true' className={styles.skeleton} />
            <span aria-hidden='true' className={styles.skeleton} />
        </div>
    );
}
