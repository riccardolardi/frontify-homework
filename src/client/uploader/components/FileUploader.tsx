import {
    type ChangeEvent,
    type ComponentPropsWithoutRef,
    type DragEvent,
    type ReactElement,
    type ReactNode,
    useId,
    useState,
} from 'react';

/** Everything the native input accepts, except what the component sets itself. */
type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange' | 'className' | 'children'>;

export type FileUploaderProps = InputProps & {
    onFiles: (files: File[]) => void;
    /** What the clickable area shows. Plain text by default. */
    children?: ReactNode;
};

/**
 * Same rules as the native `accept` attribute: ".pdf", "image/*" or "image/png", comma separated.
 * Only the picker dialog honours `accept` natively; this mirrors it for dropped files. It is a courtesy to the
 * user, not validation: what is allowed is the server's decision.
 */
export const matchesAccept = (file: File, accept?: string): boolean => {
    if (!accept) {
        return true;
    }
    const type = file.type.toLowerCase();
    return accept.split(',').some((raw) => {
        const rule = raw.trim().toLowerCase();
        if (rule.startsWith('.')) {
            return file.name.toLowerCase().endsWith(rule);
        }
        return rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : type === rule;
    });
};

/** A file picker that is also a drop zone. The native input (visually hidden) keeps it keyboard accessible. */
export const FileUploader = ({
    onFiles,
    children = 'Choose files or drop them here',
    multiple = true,
    accept,
    id: givenId,
    ...inputProps
}: FileUploaderProps): ReactElement => {
    const generatedId = useId();
    const id = givenId ?? generatedId;
    const [dragging, setDragging] = useState(false);
    const [skipped, setSkipped] = useState(0);

    const handleFiles = (list: FileList | null) => {
        const files = Array.from(list ?? []);
        const accepted = files.filter((file) => matchesAccept(file, accept));
        setSkipped(files.length - accepted.length);
        if (accepted.length > 0) {
            onFiles(accepted);
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
        // reset, so picking the same file again fires another change event
        event.target.value = '';
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (event: DragEvent) => {
        // moving over a child element also fires dragleave; ignore those
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragging(false);
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
    };

    return (
        // the wrapper only catches drops; the input inside is the real control
        <div
            role="presentation"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-8 text-center focus-within:ring-2 focus-within:ring-blue-500 ${
                dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
        >
            <input
                {...inputProps}
                id={id}
                type="file"
                className="sr-only"
                accept={accept}
                multiple={multiple}
                onChange={handleChange}
            />
            <label htmlFor={id} className="cursor-pointer text-gray-700">
                {children}
            </label>
            <p role="status" className="mt-2 text-sm text-amber-700 empty:hidden">
                {skipped > 0 && `${skipped} ${skipped === 1 ? 'file was' : 'files were'} skipped: type not accepted.`}
            </p>
        </div>
    );
};
