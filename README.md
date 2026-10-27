# File upload component

A small, reusable React file upload built for the Frontify frontend task.

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000
npm run test:client
npm run test:server
npm run lint && npm run typecheck
```

## Using it

```
src/client/uploader/      the package: types.ts (the contract), index.ts (what it exports)
  components/             FileUploader, FileList, UploadStatus, each with its test
  hooks/                  useUploads, with its test
src/client/adapters/      how to talk to the demo API: chunked, single request, shared helpers, listing
src/client/hooks/         useStoredFiles, the app's view of the server's list
src/client/App.tsx        the demo page
```

There is no bundled composite on purpose. Each page puts the pieces together itself, so it can leave one out or arrange
them differently:

```tsx
// uploader, status line and list together (see App.tsx)
const { uploads, uploaded, addFiles } = useUploads({ upload, onUploaded });
<FileUploader onFiles={addFiles} />
<UploadStatus uploads={uploads} uploaded={uploaded} />
<FileList files={[...uploads, ...storedFiles]} />

// uploader only, progress rendered however the page likes
const { uploads, addFiles } = useUploads({ upload });
<FileUploader onFiles={addFiles}>Drop your logo here</FileUploader>

// list only
<FileList files={storedFiles} />

// own list, reusing the row
<ul>{files.map((file) => <FileRow key={file.id ?? file.name} file={file} />)}</ul>
```

The only contract between the pieces and a backend is one function:

```ts
type UploadFn = (file: File, onProgress: (progress: number | null) => void, signal: AbortSignal) => Promise<UploadResult>;
type UploadResult = { ok: true } | { ok: false; error: UploadError };
```

Failures come back as data, and the list puts each kind into words. Another backend, GraphQL or a presigned URL, is
another function; nothing in the pieces changes.

## Decisions

- Chunks of one file go in order, because the server merges as soon as the last index arrives. Parallelism is across
  files, three at a time by default.
- Files up to 1 MB go in one request, bigger ones in 1 MB chunks. Each chunk is one `fetch`, which is what gives
  progress without `XMLHttpRequest`; a single request shows an indeterminate bar.
- The server is the single source of truth for the list: it is loaded on mount and after every finished upload, and
  only the newest answer counts when loads overlap.
- Rows are memoised and keyed by the id the queue gives them, or by name for stored files, so a progress tick re-renders
  one row.
- The demo accepts any type and size, as the brief asks. A page that needs limits passes `accept` to the uploader, which
  is mirrored for dropped files because the browser only honours it in the picker.

## Changes to the boilerplate

- The server e2e test ran under happy-dom, whose `FormData` multer cannot parse, so every upload got a 400. It now
  runs in plain Node and creates its upload folders itself. Tests are enabled in CI, and `typecheck` covers the server
  project too.
- `src/client/test-setup.ts` loads jest-dom and unmounts after each test (vitest has no global `afterEach`).
- The server answered the last chunk before the merged file was fully written. `mergeChunks` now waits for the stream.
- The chunk route is `/api/upload-chunk`; the boilerplate README documented it as `upload-chunks`.

## Left out on purpose

- Server-side checks of type and size. The client filters as a courtesy; the server has to decide, and this one does not.
- Cancel and retry of a single upload. The signal is already in the contract and the hook aborts on unmount; a per-row
  cancel is `cancel(id)` in the hook plus a button on uploading rows.
- Theming. Styles are Tailwind utility classes inside the components. In-house they would come from the design system
  (Fondue); markup and behaviour stay the same.
- Translation. A few texts are English literals: the progress bar's accessible name, the skipped-files notice and the
  default picker text. Making them props is the first step.
- Parallel chunks within one file. The demo server would need a separate "complete" call for that.
- A test that drives the client uploader against the real server. Client and server are separate TypeScript projects,
  so that import does not typecheck. The server suite sends the same chunk requests by hand instead.
