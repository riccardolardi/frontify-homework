import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { describeError, FileList, FileRow, formatBytes } from './FileList';

describe('FileList', () => {
    it('shows a hint when there are no files', () => {
        render(<FileList files={[]} emptyText="Nothing here" />);

        expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('lists files with their size', () => {
        render(<FileList files={[{ name: 'a.txt', size: 1536 }]} />);

        expect(screen.getByRole('list', { name: 'Files' })).toBeInTheDocument();
        expect(screen.getByText('a.txt')).toBeInTheDocument();
        expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    });

    it('shows a progress bar while a file uploads', () => {
        render(<FileList files={[{ name: 'a.txt', size: 1, progress: 0.25 }]} />);

        expect(screen.getByRole('progressbar', { name: 'Uploading a.txt' })).toHaveValue(0.25);
    });

    it('shows an indeterminate bar while progress is unknown', () => {
        render(<FileList files={[{ name: 'a.txt', size: 1, progress: null }]} />);

        expect(screen.getByRole('progressbar', { name: 'Uploading a.txt' })).not.toHaveAttribute('value');
    });

    it('announces an upload error', () => {
        render(
            <FileList files={[{ name: 'a.txt', size: 1, error: { kind: 'http', status: 500, message: 'Boom' } }]} />
        );

        expect(screen.getByRole('alert')).toHaveTextContent('Boom');
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
});

describe('describeError', () => {
    it.each([
        [{ kind: 'http', status: 500, message: 'Error saving file' }, 'Error saving file'],
        [{ kind: 'network', message: 'Failed to fetch' }, 'Could not reach the server'],
        [{ kind: 'unknown', message: 'Boom' }, 'Boom'],
    ] as const)('puts %o into words', (error, expected) => {
        expect(describeError(error)).toBe(expected);
    });
});

describe('FileRow', () => {
    it('renders on its own inside any list', () => {
        render(
            <ul>
                <FileRow file={{ name: 'a.txt', size: 2048 }} />
            </ul>
        );

        expect(screen.getByRole('listitem')).toHaveTextContent('a.txt2.0 KB');
    });
});

describe('formatBytes', () => {
    it.each([
        [0, '0 B'],
        [999, '999 B'],
        [1024, '1.0 KB'],
        [1536, '1.5 KB'],
        [5 * 1024 * 1024, '5.0 MB'],
        [3 * 1024 ** 3, '3.0 GB'],
    ])('formats %i as %s', (bytes, expected) => {
        expect(formatBytes(bytes)).toBe(expected);
    });
});
