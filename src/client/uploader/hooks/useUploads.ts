import { useEffect, useRef, useState } from 'react';

import { type FileEntry, type UploadError, type UploadFn } from '../types';

export type UploadEntry = FileEntry & { id: string };

export type UploadOptions = {
    upload: UploadFn;
    /**
     * How many files upload at the same time. Browsers allow about six connections per host over HTTP/1.1;
     * three leaves room for the list refresh and other requests, and lets files finish one after another.
     */
    concurrency?: number;
    /** Called once a file is fully uploaded. The file leaves `uploads`, the app decides where it shows up next. */
    onUploaded?: (file: File) => void;
};

/** Queues files and uploads them, a limited number at a time. */
export const useUploads = ({ upload, concurrency = 3, onUploaded }: UploadOptions) => {
    const [uploads, setUploads] = useState<UploadEntry[]>([]);
    const [uploaded, setUploaded] = useState(0);
    const queue = useRef<{ id: string; file: File }[]>([]);
    const running = useRef(0);
    const nextId = useRef(0);
    const controllers = useRef(new Map<string, AbortController>());

    const patch = (id: string, changes: Partial<UploadEntry>) =>
        setUploads((list) => list.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));

    const fail = (id: string, error: UploadError) => patch(id, { progress: undefined, error });

    const run = async (id: string, file: File) => {
        const controller = new AbortController();
        controllers.current.set(id, controller);
        try {
            const result = await upload(file, (progress) => patch(id, { progress }), controller.signal);
            if (controller.signal.aborted) {
                return; // nobody is listening any more
            }
            if (!result.ok) {
                fail(id, result.error);
                return;
            }
            setUploads((list) => list.filter((entry) => entry.id !== id));
            setUploaded((count) => count + 1);
            onUploaded?.(file);
        } catch (error) {
            // upload functions report failures as data; a throw is unexpected and shown as such
            if (!controller.signal.aborted) {
                fail(id, { kind: 'unknown', message: error instanceof Error ? error.message : 'Upload failed' });
            }
        } finally {
            controllers.current.delete(id);
        }
    };

    // starts queued files until the limit is reached; runs again whenever one finishes
    const startQueued = () => {
        while (running.current < concurrency && queue.current.length > 0) {
            const [next, ...rest] = queue.current;
            queue.current = rest;
            running.current++;
            // the slot is freed however the upload ends; run() never rejects, the second handler satisfies the lint rule
            const release = () => {
                running.current--;
                startQueued();
            };
            run(next.id, next.file).then(release, release);
        }
    };

    const addFiles = (files: File[]) => {
        // prefixed, so an id can never equal a file name when the list keys rows by id or name
        const jobs = files.map((file) => ({ id: `upload-${nextId.current++}`, file }));
        setUploads((list) => [
            ...list,
            ...jobs.map(({ id, file }) => ({ id, name: file.name, size: file.size, progress: 0 })),
        ]);
        queue.current = [...queue.current, ...jobs];
        startQueued();
    };

    // when the owner goes away, stop what is running and forget what is waiting
    useEffect(() => {
        const running = controllers.current;
        return () => {
            queue.current = [];
            for (const controller of running.values()) {
                controller.abort();
            }
        };
    }, []);

    return { uploads, uploaded, addFiles };
};
