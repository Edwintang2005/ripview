import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JourneyCard from './JourneyCard';
import { toJourneys } from '@/lib/tfnsw/map';
import type { RawTripResponse } from '@/lib/tfnsw/responses';
import tripFixture from '@/lib/tfnsw/__fixtures__/trip.json';

const journeys = toJourneys(tripFixture as RawTripResponse);
const direct = journeys[0];
const multiLeg = journeys[1];

describe('JourneyCard', () => {
    it('shows departure and arrival as one line', () => {
        render(<JourneyCard journey={direct} index={0} />);
        expect(screen.getByText('09:56')).toBeInTheDocument();
        expect(screen.getByText('10:37')).toBeInTheDocument();
    });

    it('labels a single-vehicle journey as direct', () => {
        render(<JourneyCard journey={direct} index={0} />);
        expect(screen.getByText('Direct')).toBeInTheDocument();
    });

    it('counts changes on a multi-leg journey', () => {
        render(<JourneyCard journey={multiLeg} index={1} />);
        expect(screen.getByText('2 changes')).toBeInTheDocument();
    });

    it('shows the sequence of lines ridden, excluding the walk', () => {
        render(<JourneyCard journey={multiLeg} index={1} />);
        // T8 then two buses; the walking leg gets no line badge.
        expect(screen.getByText('T8')).toBeInTheDocument();
        expect(screen.getByText('607X')).toBeInTheDocument();
        expect(screen.getByText('611')).toBeInTheDocument();
    });

    it('hides the leg detail until asked', async () => {
        const user = userEvent.setup();
        render(<JourneyCard journey={direct} index={0} />);

        const toggle = screen.getByRole('button', { name: 'Show details' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('T1 North Shore & Western Line towards Penrith via Parramatta'))
            .not.toBeInTheDocument();

        await user.click(toggle);
        expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute(
            'aria-expanded',
            'true'
        );
        expect(
            screen.getByText('T1 North Shore & Western Line towards Penrith via Parramatta')
        ).toBeInTheDocument();
    });

    it('shows the platform at each end of a leg', async () => {
        const user = userEvent.setup();
        render(<JourneyCard journey={direct} index={0} />);
        await user.click(screen.getByRole('button', { name: 'Show details' }));
        expect(screen.getByText('Platform 18')).toBeInTheDocument();
        expect(screen.getByText('Platform 4')).toBeInTheDocument();
    });

    it('reveals the stopping pattern on demand', async () => {
        const user = userEvent.setup();
        render(<JourneyCard journey={direct} index={0} />);
        await user.click(screen.getByRole('button', { name: 'Show details' }));

        // 21 stops in the sequence, minus the two the leg already names.
        const stopsToggle = screen.getByRole('button', { name: /19 stops/ });
        expect(stopsToggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Redfern Station')).not.toBeInTheDocument();

        await user.click(stopsToggle);
        expect(screen.getByText('Redfern Station')).toBeInTheDocument();
        expect(screen.getByText('Strathfield Station')).toBeInTheDocument();
    });

    it('surfaces service alerts attached to a leg', async () => {
        const user = userEvent.setup();
        const withNotice = {
            ...direct,
            legs: [{ ...direct.legs[0], notices: ['Lift out of service at Redfern'] }],
        };
        render(<JourneyCard journey={withNotice} index={0} />);
        await user.click(screen.getByRole('button', { name: 'Show details' }));
        expect(screen.getByText('Lift out of service at Redfern')).toBeInTheDocument();
    });

    it('says when a journey has no live data rather than implying it is on time', () => {
        const timetableOnly = {
            ...direct,
            isRealtime: false,
            departure: { ...direct.departure, estimated: undefined, delayMinutes: undefined },
            arrival: { ...direct.arrival, estimated: undefined, delayMinutes: undefined },
        };
        render(<JourneyCard journey={timetableOnly} index={0} />);
        expect(screen.getByText('Timetable only')).toBeInTheDocument();
        expect(screen.queryByText('On time')).not.toBeInTheDocument();
    });

    it('shows a delay on the summary when the departure is late', () => {
        const late = {
            ...direct,
            departure: { ...direct.departure, estimated: '2026-08-23T00:01:00Z', delayMinutes: 5 },
        };
        render(<JourneyCard journey={late} index={0} />);
        expect(screen.getByText('Departs 5 min late')).toBeInTheDocument();
    });

    it('shows a fare only when one was returned', () => {
        const { unmount } = render(<JourneyCard journey={direct} index={0} />);
        expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
        unmount();

        render(
            <JourneyCard
                journey={{
                    ...direct,
                    fare: { adult: 4.8, currency: 'AUD', availability: 'full' },
                }}
                index={0}
            />
        );
        expect(screen.getByText('$4.80')).toBeInTheDocument();
    });

    it('marks a partially priceable fare so the total is not read as final', () => {
        render(
            <JourneyCard
                journey={{
                    ...direct,
                    fare: { adult: 4.8, currency: 'AUD', availability: 'partial' },
                }}
                index={0}
            />
        );
        expect(screen.getByText('$4.80+')).toBeInTheDocument();
    });
});
