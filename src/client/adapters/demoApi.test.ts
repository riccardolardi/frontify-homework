import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchFiles } from './demoApi';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchFiles', () => {
    it('returns the stored files', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ files: [{ name: 'a.txt', size: 1 }] })));

        await expect(fetchFiles()).resolves.toEqual([{ name: 'a.txt', size: 1 }]);
    });

    it('throws the server message when listing fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'down' }, 500)));

        await expect(fetchFiles()).rejects.toThrow('down');
    });

    it('falls back to the status when the error body has no message', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));

        await expect(fetchFiles()).rejects.toThrow('Request failed (HTTP 500)');
    });

    it('rejects an answer that is not a list of named, sized files', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ files: [{ name: 'a.txt' }] })));

        await expect(fetchFiles()).rejects.toThrow('unexpected answer');
    });
});
