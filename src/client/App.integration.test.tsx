import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// a fake demo API: GET lists files, a successful POST adds the posted file to that list
const stubApi = (stored: { name: string; size: number }[], uploadStatus = 200) => {
    let files = stored;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method !== 'POST') {
            return Promise.resolve(json({ files }));
        }
        if (uploadStatus !== 200) {
            return Promise.resolve(json({ error: 'Error saving file' }, uploadStatus));
        }
        const file = (init.body as FormData).get('file') as File;
        // like the server: a second upload with the same name replaces the first
        files = [{ name: file.name, size: file.size }, ...files.filter((entry) => entry.name !== file.name)];
        return Promise.resolve(json({ message: 'ok' }));
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('App', () => {
    it('says it is loading until the first answer arrives', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => undefined))
        );
        render(<App />);

        expect(screen.getByText('Loading files…')).toBeInTheDocument();
        expect(screen.queryByText('No files yet')).not.toBeInTheDocument();
    });

    it('lists the stored files', async () => {
        stubApi([{ name: 'old.txt', size: 10 }]);
        render(<App />);

        expect(await screen.findByText('old.txt')).toBeInTheDocument();
    });

    it('uploads a picked file and adds it to the list', async () => {
        const fetchMock = stubApi([{ name: 'old.txt', size: 10 }]);
        render(<App />);
        await screen.findByText('old.txt');

        await userEvent.upload(
            screen.getByLabelText(/choose files/i),
            new File(['hello'], 'new.pdf', { type: 'application/pdf' })
        );

        const items = await screen.findAllByRole('listitem');
        expect(items.map((item) => item.textContent)).toEqual(['new.pdf5 B', 'old.txt10 B']);
        expect(fetchMock).toHaveBeenCalledWith('/api/upload-single', expect.objectContaining({ method: 'POST' }));
        // the list came from the server again, not from what we sent
        expect(fetchMock.mock.calls.filter(([url]) => url === '/api/files')).toHaveLength(2);
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByRole('status', { name: 'Upload status' })).toHaveTextContent('1 uploaded');
    });

    it('sends a file bigger than one chunk through the chunk route', async () => {
        const fetchMock = stubApi([]);
        render(<App />);
        await screen.findByText('No files yet');

        await userEvent.upload(
            screen.getByLabelText(/choose files/i),
            new File(['x'.repeat(1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })
        );

        await screen.findByText('big.pdf');
        expect(fetchMock).toHaveBeenCalledWith('/api/upload-chunk', expect.objectContaining({ method: 'POST' }));
    });

    it('keeps a failed upload in the list with its error', async () => {
        stubApi([], 500);
        render(<App />);
        await screen.findByText('No files yet');

        await userEvent.upload(
            screen.getByLabelText(/choose files/i),
            new File(['hello'], 'new.pdf', { type: 'application/pdf' })
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('Error saving file');
        expect(screen.getByText('new.pdf')).toBeInTheDocument();
        expect(screen.getByRole('status', { name: 'Upload status' })).toHaveTextContent('1 failed');
    });

    it('shows an error when the list cannot be loaded', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'down' }, 500)));
        render(<App />);

        expect(await screen.findByRole('alert')).toHaveTextContent('down');
    });
});
