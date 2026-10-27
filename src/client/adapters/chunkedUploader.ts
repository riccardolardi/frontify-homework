import { type UploadFn } from '../uploader/types';

import { post } from './demoApi';

export type ChunkedUploaderOptions = {
    url?: string;
    chunkSize?: number;
};

// 1 MB: well under the server's 8 MB limit per request, yet few requests for big files
export const DEFAULT_CHUNK_SIZE = 1024 * 1024;

/** Uploads a file to the demo API in chunks. One request per chunk, so progress works with plain fetch. */
export const createChunkedUploader =
    ({ url = '/api/upload-chunk', chunkSize = DEFAULT_CHUNK_SIZE }: ChunkedUploaderOptions = {}): UploadFn =>
    async (file, onProgress, signal) => {
        // an empty file is still sent as one chunk, so the server creates it
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

        // chunks go one after the other: the server merges them as soon as the last index arrives
        for (let index = 0; index < totalChunks; index++) {
            const chunk = file.slice(index * chunkSize, (index + 1) * chunkSize);
            const body = new FormData();
            // the server reads the file name from the part, so the chunk is sent as a File with the original name
            body.append('file', new File([chunk], file.name, { type: file.type }));
            body.append('currentChunkIndex', String(index));
            body.append('totalChunks', String(totalChunks));

            const result = await post(url, body, signal);
            if (!result.ok) {
                return result;
            }
            onProgress((index + 1) / totalChunks);
        }
        return { ok: true };
    };
