import { memo, type ReactElement } from 'react';

import { type FileEntry, type UploadError } from '../types';

type FileListProps = {
    files: FileEntry[];
    emptyText?: string;
};

const UNITS = ['B', 'KB', 'MB', 'GB'];

export const formatBytes = (bytes: number): string => {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < UNITS.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
};

/** A row is uploading while it has a progress value, even an unknown one (null). Stored files have none. */
export const isUploading = (file: FileEntry): boolean => file.progress !== undefined;

/** The words shown for each error kind. */
export const describeError = (error: UploadError): string => {
    switch (error.kind) {
        case 'network':
            return 'Could not reach the server';
        default:
            return error.message;
    }
};

const Row = ({ file }: { file: FileEntry }): ReactElement => (
    <li className="flex items-center gap-4 py-2">
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <span className="shrink-0 text-sm text-gray-500">{formatBytes(file.size)}</span>
        {file.error && (
            <span role="alert" className="shrink-0 text-sm text-red-600">
                {describeError(file.error)}
            </span>
        )}
        {isUploading(file) && (
            <progress
                value={file.progress ?? undefined}
                max={1}
                aria-label={`Uploading ${file.name}`}
                className="w-24"
            />
        )}
    </li>
);

/** One list row. Memoised, so a progress update re-renders only its own row. Exported for custom lists. */
export const FileRow = memo(Row);

/** Shows stored files next to files that are still uploading or have failed. */
export const FileList = ({ files, emptyText = 'No files yet' }: FileListProps): ReactElement => {
    if (files.length === 0) {
        return <p className="text-sm text-gray-500">{emptyText}</p>;
    }

    return (
        <ul aria-label="Files" className="divide-y divide-gray-200">
            {files.map((file) => (
                <FileRow key={file.id ?? file.name} file={file} />
            ))}
        </ul>
    );
};
