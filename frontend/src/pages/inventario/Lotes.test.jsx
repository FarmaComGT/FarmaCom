import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Lotes from './Lotes.jsx';

describe('pantalla de lotes', () => {
  it('muestra el mensaje de pantalla en construcción', () => {
    render(
      <MemoryRouter>
        <Lotes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Lotes')).toBeInTheDocument();
    expect(screen.getByText('Esta pantalla está en construcción.')).toBeInTheDocument();
  });
});
