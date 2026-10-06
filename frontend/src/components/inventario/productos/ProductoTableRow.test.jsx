import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductoTableRow from './ProductoTableRow';

const producto = {
  id_producto: 4,
  codigo: 'MED004-UN',
  nombre_comercial: 'Paracetamol',
  precio_compra: 10,
  stock_minimo: 5,
  activo: true,
};

describe('ProductoTableRow - historial de precios', () => {
  let propiedades;

  beforeEach(() => {
    propiedades = {
      producto,
      onEditar: vi.fn(),
      onCambiarEstado: vi.fn(),
      onVerHistorial: vi.fn(),
      cambiandoEstado: false,
    };
  });

  it('permite abrir el historial cuando el usuario tiene acceso', () => {
    render(<ProductoTableRow {...propiedades} puedeVerHistorial />);

    fireEvent.click(screen.getByRole('button', { name: /Ver historial de precios/ }));
    expect(propiedades.onVerHistorial).toHaveBeenCalledWith(producto);
  });

  it('oculta el historial cuando el usuario no tiene acceso', () => {
    render(<ProductoTableRow {...propiedades} puedeVerHistorial={false} />);
    expect(screen.queryByRole('button', { name: /Ver historial de precios/ })).not.toBeInTheDocument();
  });
});
