import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileList, FileUploader, type UploadFn, type UploadResult, UploadStatus, useUploads } from '.';

// an upload the test finishes by hand, so the rows can be checked while it is in flight
const controlledUpload = () => {
    const pending: ((result: UploadResult) => void)[] = [];
    const upload: UploadFn = (_file, onProgress) =>
        new Promise((resolve) => {
            onProgress(0.5);
            pending.push(resolve);
        });
    const finish = (result: UploadResult) =>
        act(async () => {
            pending.shift()?.(result);
            await Promise.resolve();
        });
    return { upload, finish };
};

const pdf = new File(['hello'], 'a.pdf', { type: 'application/pdf' });

// the three ways the brief wants the pieces used: together, picker without a list, list alone

const Together = ({ upload, onUploaded }: { upload: UploadFn; onUploaded?: () => void }) => {
    const { uploads, uploaded, addFiles } = useUploads({ upload, onUploaded });
    return (
        <>
            <FileUploader onFiles={addFiles} />
            <UploadStatus uploads={uploads} uploaded={uploaded} />
            <FileList files={[...uploads, { name: 'stored.pdf', size: 10 }]} />
        </>
    );
};

const PickerOnly = ({ upload }: { upload: UploadFn }) => {
    const { uploads, addFiles } = useUploads({ upload });
    return (
        <>
            <FileUploader onFiles={addFiles} />
            <p>{uploads.length} in queue</p>
        </>
    );
};

describe('the pieces composed together', () => {
    it('shows a picked file with progress, then hands it over once uploaded', async () => {
        const { upload, finish } = controlledUpload();
        const onUploaded = vi.fn();
        render(<Together upload={upload} onUploaded={onUploaded} />);

        await userEvent.upload(screen.getByLabelText(/choose files/i), pdf);

        expect(screen.getByRole('progressbar', { name: 'Uploading a.pdf' })).toHaveValue(0.5);
        expect(screen.getByRole('status', { name: 'Upload status' })).toHaveTextContent('1 uploading');
        expect(screen.getAllByRole('listitem')).toHaveLength(2);

        await finish({ ok: true });

        expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
        expect(screen.getByRole('status', { name: 'Upload status' })).toHaveTextContent('1 uploaded');
        expect(onUploaded).toHaveBeenCalledWith(pdf);
    });

    it('keeps a failed file in the list with its reason', async () => {
        const { upload, finish } = controlledUpload();
        render(<Together upload={upload} />);

        await userEvent.upload(screen.getByLabelText(/choose files/i), pdf);
        await finish({ ok: false, error: { kind: 'http', status: 500, message: 'Error saving file' } });

        expect(screen.getByRole('alert')).toHaveTextContent('Error saving file');
        expect(screen.getByRole('status', { name: 'Upload status' })).toHaveTextContent('1 failed');
    });
});

describe('the picker without a list', () => {
    it('still queues and uploads; what to render is the page’s choice', async () => {
        const { upload } = controlledUpload();
        render(<PickerOnly upload={upload} />);

        await userEvent.upload(screen.getByLabelText(/choose files/i), pdf);

        expect(screen.getByText('1 in queue')).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
});

describe('the list without a picker', () => {
    it('shows stored files on its own', () => {
        render(<FileList files={[{ name: 'stored.pdf', size: 2048 }]} />);

        expect(screen.getByRole('list', { name: 'Files' })).toBeInTheDocument();
        expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });
});
