import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CajaVentaContexto from './CajaVentaContexto.jsx';

describe('CajaVentaContexto', () => {
  it('muestra el turno y comunica la caja seleccionada', async () => {
    const onSeleccionar = vi.fn();
    render(<CajaVentaContexto cajas={[{ id_caja: 3, nombre: 'Principal', id_sesion_abierta: 8 }]} idCaja="" sesionActiva cargandoCajas={false} estadoTurno="Turno mañana activo" error={null} onSeleccionar={onSeleccionar} />);
    await userEvent.setup().selectOptions(screen.getByLabelText('Caja para esta venta'), '3');
    expect(onSeleccionar).toHaveBeenCalledWith('3');
    expect(screen.getByText('Turno mañana activo')).toBeInTheDocument();
  });
});
