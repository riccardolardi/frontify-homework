/** One row of a file list. `progress` is only set while uploading (null when unknown), `error` only after a failure. */
export type FileEntry = {
    /** Set by the upload queue. Stored files have none; their names are unique on the server. */
    id?: string;
    name: string;
    size: number;
    progress?: number | null;
    error?: UploadError;
};

/** Why an upload did not complete. Data rather than an Error, so the list can put each kind into its own words. */
export type UploadError =
    | { kind: 'http'; status: number; message: string }
    | { kind: 'network'; message: string }
    | { kind: 'unknown'; message: string };

/** What an upload function resolves with. Failures come back as data instead of being thrown. */
export type UploadResult = { ok: true } | { ok: false; error: UploadError };

/**
 * Sends one file somewhere. What an implementation promises:
 * - Resolve with `{ ok: true }` once the file is fully stored, or `{ ok: false, error }` when it is not.
 *   Do not throw for a failed upload; the hook shows a throw as an unexpected error.
 * - Call `onProgress` with a value from 0 to 1 as the upload advances, or `null` when progress cannot be
 *   measured. A final `onProgress(1)` is optional; resolving means done.
 * - Keep nothing between calls. The hook calls it once per file, several files at a time.
 * - Stop as soon as `signal` aborts; the result is then ignored.
 */
export type UploadFn = (
    file: File,
    onProgress: (progress: number | null) => void,
    signal: AbortSignal
) => Promise<UploadResult>;
