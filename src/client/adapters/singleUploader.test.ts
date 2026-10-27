import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSingleUploader } from './singleUploader';

const signal = new AbortController().signal;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('createSingleUploader', () => {
    it('posts the whole file in one request and reports unknown progress', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ message: 'ok' }));
        vi.stubGlobal('fetch', fetchMock);
        const onProgress = vi.fn<[number | null], void>();

        await createSingleUploader()(new File(['abcde'], 'a.txt'), onProgress, signal);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/upload-single');
        expect(((init.body as FormData).get('file') as File).name).toBe('a.txt');
        expect(onProgress.mock.calls).toEqual([[null]]);
    });

    it('reports the server message when the upload is rejected', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'Error saving file' }, 500)));

        await expect(createSingleUploader()(new File(['a'], 'a.txt'), vi.fn(), signal)).resolves.toEqual({
            ok: false,
            error: { kind: 'http', status: 500, message: 'Error saving file' },
        });
    });
});
