import { type FileEntry, type UploadError, type UploadResult } from '../uploader/types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * Turns a failed response into an error we can show.
 * The demo API answers `{ error }` on the upload routes and `{ message }` on the list route, and the
 * framework may answer with plain text, so all three are handled here.
 */
export const errorFromResponse = async (response: Response): Promise<Extract<UploadError, { kind: 'http' }>> => {
    const body: unknown = await response.json().catch(() => undefined);
    const detail = isRecord(body) ? body.error ?? body.message : undefined;
    const message = typeof detail === 'string' && detail ? detail : `Request failed (HTTP ${response.status})`;
    return { kind: 'http', status: response.status, message };
};

/** fetch throws a TypeError when the server cannot be reached at all; anything else is unexpected. */
const errorFromThrown = (error: unknown): UploadError =>
    error instanceof TypeError
        ? { kind: 'network', message: error.message }
        : { kind: 'unknown', message: error instanceof Error ? error.message : 'Upload failed' };

/** One POST to the demo API, with every way it can fail turned into data. */
export const post = async (url: string, body: FormData, signal: AbortSignal): Promise<UploadResult> => {
    try {
        const response = await fetch(url, { method: 'POST', body, signal });
        return response.ok ? { ok: true } : { ok: false, error: await errorFromResponse(response) };
    } catch (error) {
        return { ok: false, error: errorFromThrown(error) };
    }
};

const isFileEntry = (value: unknown): value is FileEntry =>
    isRecord(value) && typeof value.name === 'string' && typeof value.size === 'number';

/** Lists the files stored on the demo API. Throws with a readable message when that fails. */
export const fetchFiles = async (url = '/api/files'): Promise<FileEntry[]> => {
    const response = await fetch(url);
    if (!response.ok) {
        const { message } = await errorFromResponse(response);
        throw new Error(message);
    }
    // the answer crosses a trust boundary, so its shape is checked instead of assumed
    const body: unknown = await response.json();
    if (!isRecord(body) || !Array.isArray(body.files) || !body.files.every(isFileEntry)) {
        throw new Error('The server sent an unexpected answer');
    }
    return body.files;
};
