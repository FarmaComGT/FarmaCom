import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContentState from './ContentState.jsx';

describe('ContentState', () => {
  it('anuncia una carga de forma cortés', () => {
    render(<ContentState variant="loading" message="Cargando registros…" ariaLabel="Cargando registros" compact />);

    const estado = screen.getByRole('status', { name: 'Cargando registros' });
    expect(estado).toHaveAttribute('aria-live', 'polite');
    expect(estado).toHaveAttribute('aria-busy', 'true');
    expect(estado).toHaveTextContent('Cargando registros…');
  });

  it('presenta errores y permite reintentar con teclado o puntero', () => {
    const onRetry = vi.fn();
    render(
      <ContentState
        variant="error"
        title="No se pudo cargar"
        message="Comprueba la conexión."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Comprueba la conexión.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('usa un estado vacío como valor predeterminado', () => {
    render(<ContentState title="Sin resultados" message="Prueba otros filtros." />);

    expect(screen.getByRole('status')).toHaveTextContent('Sin resultados');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
  });
});
