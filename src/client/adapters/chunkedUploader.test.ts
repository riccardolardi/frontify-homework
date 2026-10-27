import { afterEach, describe, expect, it, vi } from 'vitest';

import { createChunkedUploader } from './chunkedUploader';

const signal = new AbortController().signal;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('createChunkedUploader', () => {
    it('sends the file in order, one request per chunk, and reports progress', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ message: 'ok' }));
        vi.stubGlobal('fetch', fetchMock);
        const onProgress = vi.fn<[number | null], void>();

        await createChunkedUploader({ chunkSize: 2 })(new File(['abcde'], 'a.txt'), onProgress, signal);

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal }));
        const bodies = fetchMock.mock.calls.map((call: [string, RequestInit]) => call[1].body as FormData);
        expect(bodies.map((body) => body.get('currentChunkIndex'))).toEqual(['0', '1', '2']);
        expect(bodies.map((body) => body.get('totalChunks'))).toEqual(['3', '3', '3']);
        expect(bodies.map((body) => (body.get('file') as File).size)).toEqual([2, 2, 1]);
        expect(bodies.map((body) => (body.get('file') as File).name)).toEqual(['a.txt', 'a.txt', 'a.txt']);
        expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([1 / 3, 2 / 3, 1]);
    });

    it('sends an empty file as a single chunk', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ message: 'ok' }));
        vi.stubGlobal('fetch', fetchMock);

        await createChunkedUploader()(new File([], 'empty.txt'), vi.fn(), signal);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('stops and reports the server message when a chunk is rejected', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({}))
            .mockResolvedValueOnce(json({ error: 'nope' }, 500));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            createChunkedUploader({ chunkSize: 1 })(new File(['abc'], 'a.txt'), vi.fn(), signal)
        ).resolves.toEqual({
            ok: false,
            error: { kind: 'http', status: 500, message: 'nope' },
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('falls back to the status when the error body is not JSON', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));

        await expect(createChunkedUploader()(new File(['a'], 'a.txt'), vi.fn(), signal)).resolves.toEqual({
            ok: false,
            error: { kind: 'http', status: 502, message: 'Request failed (HTTP 502)' },
        });
    });

    it('reports an unreachable server as a network error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

        await expect(createChunkedUploader()(new File(['a'], 'a.txt'), vi.fn(), signal)).resolves.toEqual({
            ok: false,
            error: { kind: 'network', message: 'Failed to fetch' },
        });
    });
});
