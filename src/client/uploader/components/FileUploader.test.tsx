import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileUploader, matchesAccept } from './FileUploader';

const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];

describe('FileUploader', () => {
    it('passes picked files to onFiles', async () => {
        const onFiles = vi.fn();
        render(<FileUploader onFiles={onFiles} />);

        await userEvent.upload(screen.getByLabelText(/choose files/i), files);

        expect(onFiles).toHaveBeenCalledWith(files);
    });

    it('passes dropped files to onFiles', () => {
        const onFiles = vi.fn();
        render(<FileUploader onFiles={onFiles}>Drop here</FileUploader>);

        fireEvent.drop(screen.getByText('Drop here'), { dataTransfer: { files } });

        expect(onFiles).toHaveBeenCalledWith(files);
    });

    it('forwards native input props', () => {
        render(<FileUploader onFiles={vi.fn()} accept="image/*" multiple={false} name="logo" disabled />);

        const input = screen.getByLabelText<HTMLInputElement>(/choose files/i);
        expect(input).toHaveAttribute('accept', 'image/*');
        expect(input).toHaveAttribute('name', 'logo');
        expect(input.multiple).toBe(false);
        expect(input).toBeDisabled();
    });
});

describe('FileUploader accept on drops', () => {
    it('skips dropped files that do not match accept and says so', () => {
        const onFiles = vi.fn();
        render(
            <FileUploader onFiles={onFiles} accept="image/*">
                Drop here
            </FileUploader>
        );
        const image = new File(['i'], 'a.png', { type: 'image/png' });
        const text = new File(['t'], 'b.txt', { type: 'text/plain' });

        fireEvent.drop(screen.getByText('Drop here'), { dataTransfer: { files: [image, text] } });

        expect(onFiles).toHaveBeenCalledWith([image]);
        expect(screen.getByRole('status')).toHaveTextContent('1 file was skipped: type not accepted.');
    });
});

describe('matchesAccept', () => {
    const png = new File([''], 'photo.PNG', { type: 'image/png' });
    const pdf = new File([''], 'doc.pdf', { type: 'application/pdf' });

    it.each([
        [undefined, png, true],
        ['image/*', png, true],
        ['image/*', pdf, false],
        ['image/png', png, true],
        ['.png', png, true],
        ['.pdf, image/jpeg', png, false],
        ['.pdf, image/jpeg', pdf, true],
    ])('accept %s matches %o: %s', (accept, file, expected) => {
        expect(matchesAccept(file, accept)).toBe(expected);
    });
});
