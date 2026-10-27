import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type UploadResult } from '../types';

import { useUploads } from './useUploads';

const file = (name: string) => new File(['x'], name);

// an upload the test finishes or fails by hand
const controlledUpload = () => {
    const pending: {
        file: File;
        onProgress: (progress: number | null) => void;
        signal: AbortSignal;
        resolve: (result: UploadResult) => void;
        reject: (error: Error) => void;
    }[] = [];
    const upload = vi.fn(
        (file: File, onProgress: (progress: number | null) => void, signal: AbortSignal) =>
            new Promise<UploadResult>((resolve, reject) => {
                signal.addEventListener('abort', () => reject(new Error('aborted')));
                pending.push({ file, onProgress, signal, resolve, reject });
            })
    );
    return { upload, pending };
};

// settle an upload and let React apply the state updates that follow
const settle = (action: () => void) =>
    act(async () => {
        action();
        await Promise.resolve();
    });

describe('useUploads', () => {
    it('lists added files with zero progress', () => {
        const { upload } = controlledUpload();
        const { result } = renderHook(() => useUploads({ upload }));

        act(() => result.current.addFiles([file('a.txt')]));

        expect(result.current.uploads).toEqual([{ id: 'upload-0', name: 'a.txt', size: 1, progress: 0 }]);
    });

    it('uploads at most `concurrency` files at the same time', async () => {
        const { upload, pending } = controlledUpload();
        const { result } = renderHook(() => useUploads({ upload, concurrency: 2 }));

        act(() => result.current.addFiles([file('a'), file('b'), file('c')]));
        expect(upload).toHaveBeenCalledTimes(2);

        await settle(() => pending[0].resolve({ ok: true }));
        expect(upload).toHaveBeenCalledTimes(3);
    });

    it('reports progress, then removes the finished file and calls onUploaded', async () => {
        const { upload, pending } = controlledUpload();
        const onUploaded = vi.fn();
        const { result } = renderHook(() => useUploads({ upload, onUploaded }));

        act(() => result.current.addFiles([file('a')]));
        act(() => pending[0].onProgress(0.5));
        expect(result.current.uploads[0].progress).toBe(0.5);

        await settle(() => pending[0].resolve({ ok: true }));
        expect(result.current.uploads).toEqual([]);
        expect(result.current.uploaded).toBe(1);
        expect(onUploaded).toHaveBeenCalledWith(pending[0].file);
    });

    it('keeps a failed file with the error the upload reported', async () => {
        const { upload, pending } = controlledUpload();
        const { result } = renderHook(() => useUploads({ upload }));
        const error = { kind: 'http', status: 500, message: 'nope' } as const;

        act(() => result.current.addFiles([file('a')]));
        await settle(() => pending[0].resolve({ ok: false, error }));

        expect(result.current.uploads).toEqual([{ id: 'upload-0', name: 'a', size: 1, error }]);
    });

    it('treats an upload that throws as an unknown failure', async () => {
        const { upload, pending } = controlledUpload();
        const { result } = renderHook(() => useUploads({ upload }));

        act(() => result.current.addFiles([file('a')]));
        await settle(() => pending[0].reject(new Error('Boom')));

        expect(result.current.uploads[0].error).toEqual({ kind: 'unknown', message: 'Boom' });
    });

    it('aborts running uploads and drops waiting ones when its owner unmounts', () => {
        const { upload, pending } = controlledUpload();
        const { result, unmount } = renderHook(() => useUploads({ upload, concurrency: 1 }));

        act(() => result.current.addFiles([file('a'), file('b')]));
        unmount();

        expect(pending[0].signal.aborted).toBe(true);
        expect(upload).toHaveBeenCalledTimes(1);
    });
});
