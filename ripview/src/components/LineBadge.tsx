import type { Line, Mode } from '@/lib/types';
import { modeLabel } from '@/lib/modes';
import styles from './LineBadge.module.css';

interface LineBadgeProps {
    line: Line;
    /** `sm` for inline use in a list row, `md` for a journey heading. */
    size?: 'sm' | 'md';
}

/**
 * The coloured line designator, e.g. a T1 or M1 chip.
 *
 * The chip carries the line's brand colour as an inline style because the
 * colour comes from data, not from a class. Text is forced to white with a
 * dark text-shadow rather than being computed per-colour: every TfNSW line
 * colour is dark enough for white text, and the shadow covers the lightest
 * (T1 orange) without a contrast calculation on every render.
 */
export default function LineBadge({ line, size = 'sm' }: LineBadgeProps) {
    return (
        <span
            className={`${styles.badge} ${size === 'md' ? styles.medium : ''}`}
            style={{ backgroundColor: line.colour }}
        >
            <span className={styles.srOnly}>{`${modeLabel(line.mode)} `}</span>
            {line.number}
        </span>
    );
}

interface ModeBadgeProps {
    mode: Mode;
}

/** A neutral chip for a mode without a line, used for walking legs. */
export function ModeBadge({ mode }: ModeBadgeProps) {
    return <span className={styles.modeBadge}>{modeLabel(mode)}</span>;
}
