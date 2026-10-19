import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EstadoBadge from './EstadoBadge.jsx';

describe('EstadoBadge', () => {
  it('distingue un producto que todavía no tiene lotes', () => {
    render(<EstadoBadge estado="sin_lotes" />);

    expect(screen.getByText('Sin lotes')).toBeInTheDocument();
  });

  it('mantiene la etiqueta del estado normal', () => {
    render(<EstadoBadge estado="normal" />);

    expect(screen.getByText('En buen estado')).toBeInTheDocument();
  });
});
