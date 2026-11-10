import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CajaTable from './CajaTable';
import { elegirAccion } from '../../test/menuAcciones';

const cajas = Array.from({ length: 45 }, (_, i) => ({ id_caja: i + 1, nombre: `Caja ${i + 1}`, nombre_sucursal: 'Central', activa: i % 2 === 0 }));

describe('CajaTable', () => {
  it('renderiza la página recibida del servidor sin perder acciones', async () => {
    const user = userEvent.setup();
    const editar = vi.fn();
    const cambiarEstado = vi.fn();
    const pagina = cajas.slice(20, 40);
    const { rerender } = render(<CajaTable cajas={pagina} onEditar={editar} onCambiarEstado={cambiarEstado} />);
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
    await elegirAccion(user, 'Caja 21', 'Editar');
    expect(editar).toHaveBeenCalledWith(pagina[0]);
    await elegirAccion(user, 'Caja 22', 'Activar');
    expect(cambiarEstado).toHaveBeenCalledWith(pagina[1]);
    rerender(<CajaTable cajas={cajas.slice(40)} onEditar={editar} onCambiarEstado={cambiarEstado} cambiandoEstadoId={45} />);
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Más acciones para Caja 45' })).toBeDisabled();
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
