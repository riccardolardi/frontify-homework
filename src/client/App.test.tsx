import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import '@testing-library/jest-dom/vitest';
import { App } from './App';

describe('App', () => {
    it('should render the component', () => {
        const { getByText } = render(<App />);

        expect(getByText('Hello there')).toBeInTheDocument();
        expect(getByText(/everything brand starts small/i)).toBeInTheDocument();
    });
});
