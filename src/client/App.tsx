import { type ReactElement } from 'react';

import { createChunkedUploader, DEFAULT_CHUNK_SIZE } from './adapters/chunkedUploader';
import { createSingleUploader } from './adapters/singleUploader';
import { useStoredFiles } from './hooks/useStoredFiles';
import { FileList, FileUploader, type UploadFn, UploadStatus, useUploads } from './uploader';

const chunked = createChunkedUploader();
const single = createSingleUploader();

// files up to one chunk in size go in one request, bigger ones in chunks
const upload: UploadFn = (file, onProgress, signal) => {
    const send = file.size > DEFAULT_CHUNK_SIZE ? chunked : single;
    return send(file, onProgress, signal);
};

export const App = (): ReactElement => {
    const { files, error, reload } = useStoredFiles();
    const { uploads, uploaded, addFiles } = useUploads({ upload, onUploaded: reload });

    return (
        <main className="mx-auto max-w-2xl space-y-4 p-6">
            <h1 className="text-2xl font-bold text-gray-900">File upload</h1>
            {error && (
                <p role="alert" className="text-red-600">
                    {error}
                </p>
            )}
            <FileUploader onFiles={addFiles} />
            <UploadStatus uploads={uploads} uploaded={uploaded} />
            {files === undefined && !error ? (
                <p className="text-sm text-gray-500">Loading files…</p>
            ) : (
                <FileList files={[...uploads, ...(files ?? [])]} />
            )}
        </main>
    );
};
