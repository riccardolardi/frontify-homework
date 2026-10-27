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
