import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchFiles } from '../adapters/demoApi';
import { type FileEntry } from '../uploader';

/**
 * The files the server has. `files` is undefined until the first answer, so a page never claims the folder is
 * empty before it knows. The server is the single source of truth: call `reload` whenever it may have changed.
 */
export const useStoredFiles = () => {
    const [files, setFiles] = useState<FileEntry[]>();
    const [error, setError] = useState<string>();
    const latestRequest = useRef(0);

    // several loads can overlap; only the newest answer counts
    const reload = useCallback(() => {
        const request = ++latestRequest.current;
        fetchFiles()
            .then((list) => {
                if (request === latestRequest.current) {
                    setError(undefined);
                    setFiles(list);
                }
            })
            .catch((loadError: Error) => {
                if (request === latestRequest.current) {
                    setError(loadError.message);
                }
            });
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { files, error, reload };
};
