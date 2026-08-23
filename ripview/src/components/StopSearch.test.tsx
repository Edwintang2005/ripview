import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StopSearch from './StopSearch';
import { searchStopsAction } from '@/app/actions/transport';
import type { Result, StopSuggestion } from '@/lib/types';

// The action is a server action; the component under test only needs its
// contract, and mocking it keeps these tests offline and deterministic.
jest.mock('@/app/actions/transport', () => ({
    searchStopsAction: jest.fn(),
}));

const mockSearch = searchStopsAction as jest.MockedFunction<typeof searchStopsAction>;

function suggestion(name: string, id: string): StopSuggestion {
    return { id: id, name: name, modes: ['train'], matchQuality: 900 };
}

/**
 * A stop only the live search can return — it is a bus stand, so it is absent
 * from the bundled train-and-metro list. Waiting for it proves the assertion is
 * looking at live results rather than the instant local fallback.
 */
const LIVE_ONLY_STOP = 'Wynyard Station, Carrington St, Stand A';

function ok(data: StopSuggestion[]): Result<StopSuggestion[]> {
    return { ok: true, data: data };
}

function Harness({ onSelect }: { onSelect: (stop: { id: string; name: string } | null) => void }) {
    return <StopSearch label='From' value='' onSelect={onSelect} />;
}

beforeEach(() => {
    mockSearch.mockResolvedValue(ok([]));
});

describe('StopSearch', () => {
    it('is a labelled combobox', () => {
        render(<Harness onSelect={jest.fn()} />);
        const input = screen.getByLabelText('From');
        expect(input).toHaveAttribute('role', 'combobox');
        expect(input).toHaveAttribute('aria-autocomplete', 'list');
        expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('searches live once enough has been typed, and shows the results', async () => {
        const user = userEvent.setup();
        mockSearch.mockResolvedValue(
            ok([suggestion('Wynyard Station', '10101100'), suggestion('Wynyard Park', 'poi1')])
        );
        render(<Harness onSelect={jest.fn()} />);

        await user.type(screen.getByLabelText('From'), 'Wynyard');

        // The bundled list answers instantly while the request is in flight, so
        // wait for a result only the live search can produce.
        await screen.findByText('Wynyard Park');
        const options = screen.getAllByRole('option');
        expect(options.map((option) => option.textContent)).toEqual([
            'Wynyard StationTrain',
            'Wynyard ParkTrain',
        ]);
        expect(screen.getByLabelText('From')).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not call the API for a query below the minimum length', async () => {
        const user = userEvent.setup();
        render(<Harness onSelect={jest.fn()} />);
        await user.type(screen.getByLabelText('From'), 'Wy');
        // Long enough for the debounce to have fired if it were going to.
        await new Promise((resolve) => setTimeout(resolve, 400));
        expect(mockSearch).not.toHaveBeenCalled();
    });

    it('falls back to the bundled station list below the minimum length', async () => {
        const user = userEvent.setup();
        render(<Harness onSelect={jest.fn()} />);
        // 'Ep' matches Epping in the bundled list without any network call.
        await user.type(screen.getByLabelText('From'), 'Ep');
        await waitFor(() => {
            expect(screen.getByRole('listbox')).toBeInTheDocument();
        });
        expect(screen.getByText('Epping Station')).toBeInTheDocument();
    });

    it('debounces so it does not query on every keystroke', async () => {
        const user = userEvent.setup();
        render(<Harness onSelect={jest.fn()} />);
        await user.type(screen.getByLabelText('From'), 'Wynyard');
        await waitFor(() => {
            expect(mockSearch).toHaveBeenCalled();
        });
        // Seven characters typed, but only the settled value is searched.
        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(mockSearch).toHaveBeenCalledWith('Wynyard');
    });

    it('navigates the list with the arrow keys and reports the active option', async () => {
        const user = userEvent.setup();
        mockSearch.mockResolvedValue(
            ok([suggestion('Wynyard Station', 'a'), suggestion('Wynyard Park', 'b')])
        );
        render(<Harness onSelect={jest.fn()} />);
        const input = screen.getByLabelText('From');
        await user.type(input, 'Wynyard');
        // The bundled list offers one Wynyard entry; the live search offers two,
        // so a count of two means the live results have landed.
        await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));

        await user.keyboard('{ArrowDown}');
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
        expect(input.getAttribute('aria-activedescendant')).toBe(
            screen.getAllByRole('option')[0].id
        );

        await user.keyboard('{ArrowDown}');
        expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

        // Wraps around rather than dead-ending.
        await user.keyboard('{ArrowDown}');
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
        await user.keyboard('{ArrowUp}');
        expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('selects the highlighted option with Enter', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        mockSearch.mockResolvedValue(ok([suggestion(LIVE_ONLY_STOP, '2000441')]));
        render(<Harness onSelect={onSelect} />);

        await user.type(screen.getByLabelText('From'), 'Wynyard');
        await screen.findByRole('option', { name: new RegExp(LIVE_ONLY_STOP) });
        await user.keyboard('{ArrowDown}{Enter}');

        expect(onSelect).toHaveBeenLastCalledWith({ id: '2000441', name: LIVE_ONLY_STOP });
        expect(screen.getByLabelText('From')).toHaveValue(LIVE_ONLY_STOP);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('selects by click', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        mockSearch.mockResolvedValue(ok([suggestion(LIVE_ONLY_STOP, '2000441')]));
        render(<Harness onSelect={onSelect} />);

        await user.type(screen.getByLabelText('From'), 'Wynyard');
        await screen.findByRole('option', { name: new RegExp(LIVE_ONLY_STOP) });
        await user.click(screen.getByRole('option'));

        expect(onSelect).toHaveBeenLastCalledWith({ id: '2000441', name: LIVE_ONLY_STOP });
    });

    it('closes the list on Escape without selecting', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        mockSearch.mockResolvedValue(ok([suggestion(LIVE_ONLY_STOP, 'a')]));
        render(<Harness onSelect={onSelect} />);

        await user.type(screen.getByLabelText('From'), 'Wynyard');
        await screen.findByRole('option', { name: new RegExp(LIVE_ONLY_STOP) });
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(onSelect).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    });

    it('invalidates the selection as soon as the text is edited', async () => {
        // Otherwise the field could read "Wynyard Stat" while still holding the
        // id for a stop the user is no longer choosing, and plan the wrong trip.
        const user = userEvent.setup();
        const onSelect = jest.fn();
        mockSearch.mockResolvedValue(ok([suggestion(LIVE_ONLY_STOP, '2000441')]));
        render(<Harness onSelect={onSelect} />);

        const input = screen.getByLabelText('From');
        await user.type(input, 'Wynyard');
        await screen.findByRole('option', { name: new RegExp(LIVE_ONLY_STOP) });
        await user.click(screen.getByRole('option'));
        expect(onSelect).toHaveBeenLastCalledWith({ id: '2000441', name: LIVE_ONLY_STOP });

        await user.type(input, 'x');
        expect(onSelect).toHaveBeenLastCalledWith(null);
    });

    it('clears the field and the selection with the clear button', async () => {
        const user = userEvent.setup();
        const onSelect = jest.fn();
        render(<Harness onSelect={onSelect} />);

        const input = screen.getByLabelText('From');
        await user.type(input, 'Wynyard');
        await user.click(screen.getByRole('button', { name: 'Clear from' }));

        expect(input).toHaveValue('');
        expect(onSelect).toHaveBeenLastCalledWith(null);
    });

    it('falls back to bundled stations and says so when the API fails', async () => {
        const user = userEvent.setup();
        mockSearch.mockResolvedValue({
            ok: false,
            error: { kind: 'network', message: 'Could not reach Transport for NSW.' },
        });
        render(<Harness onSelect={jest.fn()} />);

        await user.type(screen.getByLabelText('From'), 'Epping');

        // The note only appears once the failed request has come back.
        await screen.findByText('Showing bundled stations only — live search is unavailable.');
        expect(screen.getByText('Epping Station')).toBeInTheDocument();
    });

    it('ignores a slow earlier response that resolves after a newer one', async () => {
        // Without request sequencing, typing "Cen" then "Central" could leave
        // the results for "Cen" on screen if that request finished last.
        const user = userEvent.setup();
        let resolveFirst: (value: Result<StopSuggestion[]>) => void = () => {};
        mockSearch
            .mockImplementationOnce(
                () =>
                    new Promise<Result<StopSuggestion[]>>((resolve) => {
                        resolveFirst = resolve;
                    })
            )
            .mockResolvedValueOnce(ok([suggestion('Central Station', 'central')]));

        render(<Harness onSelect={jest.fn()} />);
        const input = screen.getByLabelText('From');

        await user.type(input, 'Cen');
        await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
        await user.type(input, 'tral');
        await waitFor(() => expect(screen.getByText('Central Station')).toBeInTheDocument());

        // The stale first request now finishes with different data.
        resolveFirst(ok([suggestion('Stale Result', 'stale')]));
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(screen.queryByText('Stale Result')).not.toBeInTheDocument();
        expect(screen.getByText('Central Station')).toBeInTheDocument();
    });
});
