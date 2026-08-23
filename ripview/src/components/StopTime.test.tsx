import { render, screen } from '@testing-library/react';
import StopTime from './StopTime';
import type { StopCall } from '@/lib/types';

function call(overrides: Partial<StopCall> = {}): StopCall {
    return {
        name: 'Central Station, Platform 18, Sydney',
        shortName: 'Central Station',
        planned: '2026-08-22T23:56:00Z',
        ...overrides,
    };
}

describe('StopTime', () => {
    it('shows the scheduled time plainly when there is no live data', () => {
        // Crucially, this must not claim the service is "on time" — we do not
        // know that. Absence of real-time data is its own state.
        render(<StopTime call={call()} />);
        expect(screen.getByText('09:56')).toBeInTheDocument();
        expect(screen.queryByText('On time')).not.toBeInTheDocument();
        expect(screen.queryByText(/late|early/)).not.toBeInTheDocument();
    });

    it('marks a service running to time as on time', () => {
        render(
            <StopTime
                call={call({ estimated: '2026-08-22T23:56:00Z', delayMinutes: 0 })}
            />
        );
        expect(screen.getByText('09:56')).toBeInTheDocument();
        expect(screen.getByText('On time')).toBeInTheDocument();
    });

    it('leads with the estimate and keeps the timetable visible when late', () => {
        render(
            <StopTime
                call={call({ estimated: '2026-08-23T00:01:00Z', delayMinutes: 5 })}
            />
        );
        // The live time is what the traveller acts on.
        expect(screen.getByText('10:01')).toBeInTheDocument();
        // The scheduled time is still there, so the delay is verifiable.
        expect(screen.getByText('09:56')).toBeInTheDocument();
        expect(screen.getByText('5 min late')).toBeInTheDocument();
    });

    it('describes a service running early', () => {
        render(
            <StopTime
                call={call({ estimated: '2026-08-22T23:54:00Z', delayMinutes: -2 })}
            />
        );
        expect(screen.getByText('2 min early')).toBeInTheDocument();
    });

    it('renders an em dash rather than "Invalid Date" for a missing time', () => {
        render(<StopTime call={call({ planned: '' })} />);
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    describe('compact', () => {
        it('shows only the effective time', () => {
            // Used down a stopping pattern, where repeating the delay on every
            // row is noise.
            render(
                <StopTime
                    call={call({ estimated: '2026-08-23T00:01:00Z', delayMinutes: 5 })}
                    compact
                />
            );
            expect(screen.getByText('10:01')).toBeInTheDocument();
            expect(screen.queryByText('09:56')).not.toBeInTheDocument();
            expect(screen.queryByText('5 min late')).not.toBeInTheDocument();
        });

        it('still announces the delay to assistive technology', () => {
            render(
                <StopTime
                    call={call({ estimated: '2026-08-23T00:01:00Z', delayMinutes: 5 })}
                    compact
                />
            );
            expect(screen.getByLabelText('10:01, 5 min late')).toBeInTheDocument();
        });
    });
});
