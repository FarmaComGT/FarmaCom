import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CajaTable from './CajaTable';

const cajas = Array.from({ length: 45 }, (_, i) => ({ id_caja: i + 1, nombre: `Caja ${i + 1}`, nombre_sucursal: 'Central', activa: i % 2 === 0 }));

describe('CajaTable', () => {
  it('limita las filas y permite recorrer las páginas sin perder acciones', () => {
    const cambiarPagina = vi.fn();
    const editar = vi.fn();
    const cambiarEstado = vi.fn();
    const props = { cajas, onPaginaChange: cambiarPagina, onEditar: editar, onCambiarEstado: cambiarEstado };
    const { rerender } = render(<CajaTable {...props} />);
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(cambiarPagina).toHaveBeenCalledWith(2);
    rerender(<CajaTable {...props} pagina={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(cambiarPagina).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Caja 21' }));
    expect(editar).toHaveBeenCalledWith(cajas[20]);
    fireEvent.click(screen.getByRole('button', { name: 'Activar Caja 22' }));
    expect(cambiarEstado).toHaveBeenCalledWith(cajas[21]);
    rerender(<CajaTable {...props} pagina={99} cambiandoEstadoId={45} />);
    expect(screen.getByText('Página 3 de 3')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desactivar Caja 45' })).toBeDisabled();
  });

  it('ofrece limpiar una búsqueda sin resultados y distingue la carga', () => {
    const limpiar = vi.fn();
    const { rerender } = render(<CajaTable cajas={[]} onLimpiar={limpiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(limpiar).toHaveBeenCalledOnce();
    rerender(<CajaTable cajas={[]} cargando />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando cajas…');
    expect(screen.queryByText('No hay cajas para mostrar.')).not.toBeInTheDocument();
  });
});
