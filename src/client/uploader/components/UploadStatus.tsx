import { type ReactElement } from 'react';

import { type FileEntry } from '../types';

import { isUploading } from './FileList';

type UploadStatusProps = {
    /** The rows the upload queue currently holds. */
    uploads: FileEntry[];
    /** How many files finished so far. */
    uploaded: number;
};

/** One polite line for screen readers. It only changes when a file's status changes, so progress ticks stay quiet. */
export const UploadStatus = ({ uploads, uploaded }: UploadStatusProps): ReactElement => {
    const active = uploads.filter(isUploading).length;
    const failed = uploads.filter((entry) => entry.error).length;
    const text = [
        active > 0 && `${active} uploading`,
        uploaded > 0 && `${uploaded} uploaded`,
        failed > 0 && `${failed} failed`,
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <p role="status" aria-label="Upload status" className="text-sm text-gray-600 empty:hidden">
            {text}
        </p>
    );
};
