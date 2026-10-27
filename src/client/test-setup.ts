import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest has no global afterEach, so testing-library cannot unmount on its own
afterEach(cleanup);
