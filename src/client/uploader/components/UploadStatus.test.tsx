import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UploadStatus } from './UploadStatus';

describe('UploadStatus', () => {
    it('says nothing while nothing has happened', () => {
        render(<UploadStatus uploads={[]} uploaded={0} />);

        expect(screen.getByRole('status', { name: 'Upload status' })).toBeEmptyDOMElement();
    });

    it('counts uploading, uploaded and failed files', () => {
        render(
            <UploadStatus
                uploads={[
                    { name: 'a', size: 1, progress: 0.4 },
                    { name: 'b', size: 1, progress: null },
                    { name: 'c', size: 1, error: { kind: 'unknown', message: 'Boom' } },
                ]}
                uploaded={3}
            />
        );

        expect(screen.getByRole('status')).toHaveTextContent('2 uploading, 3 uploaded, 1 failed');
    });
});
