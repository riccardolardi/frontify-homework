import { type UploadFn } from '../uploader/types';

import { post } from './demoApi';

type SingleUploaderOptions = {
    url?: string;
};

/** Uploads a file to the demo API in one request. fetch cannot report upload progress, so progress is unknown. */
export const createSingleUploader =
    ({ url = '/api/upload-single' }: SingleUploaderOptions = {}): UploadFn =>
    async (file, onProgress, signal) => {
        onProgress(null);
        const body = new FormData();
        body.append('file', file, file.name);

        return post(url, body, signal);
    };
