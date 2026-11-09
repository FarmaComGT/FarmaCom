import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FondoParticulas from './FondoParticulas.jsx';

describe('FondoParticulas', () => {
  it('renderiza un lienzo decorativo y se desmonta sin errores', () => {
    const { container, unmount } = render(<FondoParticulas />);
    const lienzo = container.querySelector('canvas');
    expect(lienzo).toBeInTheDocument();
    expect(lienzo).toHaveAttribute('aria-hidden', 'true');
    expect(() => unmount()).not.toThrow();
  });
});
