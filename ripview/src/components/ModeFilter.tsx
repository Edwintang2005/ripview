'use client';

import { SELECTABLE_MODES, modeLabel } from '@/lib/modes';
import type { SelectableMode } from '@/lib/types';
import styles from './ModeFilter.module.css';

interface ModeFilterProps {
    selected: readonly SelectableMode[];
    onChange: (modes: SelectableMode[]) => void;
    wheelchairOnly: boolean;
    onWheelchairChange: (value: boolean) => void;
}

/**
 * Which modes of transport to include.
 *
 * This replaces a hardcoded set of `exclMOT_*` exclusions in the old
 * `planTrip`, which silently blocked bus, ferry, light rail and coach legs —
 * so any trip needing one of those simply returned nothing.
 *
 * Deselecting every mode is prevented: an empty selection would exclude
 * everything and make the search unable to return a result, which is a worse
 * outcome than not honouring the last click.
 */
export default function ModeFilter({
    selected,
    onChange,
    wheelchairOnly,
    onWheelchairChange,
}: ModeFilterProps) {
    const toggle = (mode: SelectableMode) => {
        const isSelected = selected.includes(mode);
        if (isSelected && selected.length === 1) {
            return;
        }
        onChange(
            isSelected
                ? selected.filter((current) => current !== mode)
                : [...selected, mode]
        );
    };

    return (
        <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Travel by</legend>
            <div className={styles.chips}>
                {SELECTABLE_MODES.map((mode) => {
                    const isSelected = selected.includes(mode);
                    return (
                        <label
                            key={mode}
                            className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                        >
                            <input
                                type='checkbox'
                                className={styles.checkbox}
                                checked={isSelected}
                                onChange={() => toggle(mode)}
                            />
                            {modeLabel(mode)}
                        </label>
                    );
                })}
            </div>
            <label className={styles.accessible}>
                <input
                    type='checkbox'
                    checked={wheelchairOnly}
                    onChange={(event) => onWheelchairChange(event.target.checked)}
                />
                Wheelchair-accessible journeys only
            </label>
        </fieldset>
    );
}
