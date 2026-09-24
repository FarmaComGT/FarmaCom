import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useCaja from '../../hooks/useCaja';
import CajaOperativa from './CajaOperativa';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ sucursalActivaId: 2 }),
}));

vi.mock('../../hooks/useCaja', () => ({
  default: vi.fn(),
}));

const abrir = vi.fn();
const registrar = vi.fn();
const seleccionarCaja = vi.fn();
const limpiarError = vi.fn();

const crearEstado = (cambios = {}) => ({
  cajas: [
    { id_caja: 3, nombre: 'Caja principal', activa: true },
    { id_caja: 4, nombre: 'Caja auxiliar', activa: true },
  ],
  cajaSeleccionada: null,
  idCajaSeleccionada: null,
  sesionActual: null,
  cargandoCajas: false,
  cargandoSesion: false,
  procesando: false,
  error: null,
  seleccionarCaja,
  abrir,
  registrar,
  limpiarError,
  ...cambios,
});

describe('CajaOperativa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCaja.mockReturnValue(crearEstado());
  });

  it('muestra las cajas activas para seleccionar', () => {
    render(<CajaOperativa />);

    expect(useCaja).toHaveBeenCalledWith(2);
    expect(screen.getByRole('option', { name: 'Caja principal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Caja auxiliar' })).toBeInTheDocument();
  });

  it('notifica al hook cuando se selecciona una caja', async () => {
    const user = userEvent.setup();
    render(<CajaOperativa />);

    await user.selectOptions(screen.getByLabelText('Caja disponible'), '3');

    expect(seleccionarCaja).toHaveBeenCalledWith('3');
    expect(limpiarError).toHaveBeenCalled();
  });

  it('valida el turno antes de intentar abrir la caja', async () => {
    const user = userEvent.setup();
    useCaja.mockReturnValue(crearEstado({
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
    }));
    render(<CajaOperativa />);

    await user.type(screen.getByLabelText('Fondo inicial'), '250.00');
    await user.click(screen.getByRole('button', { name: 'Abrir turno' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecciona el turno que deseas abrir.',
    );
    expect(abrir).not.toHaveBeenCalled();
  });

  it('abre la caja con el turno y fondo inicial ingresados', async () => {
    const user = userEvent.setup();
    abrir.mockResolvedValue({ id_sesion_caja: 9 });
    useCaja.mockReturnValue(crearEstado({
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
    }));
    render(<CajaOperativa />);

    await user.selectOptions(screen.getByLabelText('Turno'), 'mañana');
    await user.type(screen.getByLabelText('Fondo inicial'), '250.00');
    await user.click(screen.getByRole('button', { name: 'Abrir turno' }));

    expect(abrir).toHaveBeenCalledWith({
      turno: 'mañana',
      fondo_inicial: '250.00',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'La sesión de caja se abrió correctamente.',
    );
  });

  it('muestra los datos básicos cuando la caja ya tiene un turno abierto', () => {
    useCaja.mockReturnValue(crearEstado({
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
      sesionActual: { id_sesion_caja: 9, turno: 'tarde' },
    }));
    render(<CajaOperativa />);

    expect(screen.getByRole('heading', {
      name: 'Turno abierto en Caja principal',
    })).toBeInTheDocument();
    expect(screen.getByText('Turno tarde')).toBeInTheDocument();
    expect(screen.getByText(/Q\s*0\.00/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir turno' })).not.toBeInTheDocument();
  });

  it('registra una entrada de efectivo en el turno abierto', async () => {
    const user = userEvent.setup();
    registrar.mockResolvedValue({ id_movimiento_caja: 12 });
    useCaja.mockReturnValue(crearEstado({
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
      sesionActual: {
        id_sesion_caja: 9,
        turno: 'mañana',
        fondo_inicial: '250.00',
      },
    }));
    render(<CajaOperativa />);

    await user.type(screen.getByLabelText('Monto'), '50.00');
    await user.type(screen.getByLabelText('Motivo'), 'Cambio adicional');
    await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }));

    expect(registrar).toHaveBeenCalledWith({
      tipo: 'entrada',
      monto: '50.00',
      motivo: 'Cambio adicional',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'La entrada se registró correctamente.',
    );
  });

  it('permite seleccionar y registrar una salida', async () => {
    const user = userEvent.setup();
    registrar.mockResolvedValue({ id_movimiento_caja: 13 });
    useCaja.mockReturnValue(crearEstado({
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
      sesionActual: { id_sesion_caja: 9, turno: 'noche' },
    }));
    render(<CajaOperativa />);

    await user.click(screen.getByRole('radio', { name: 'Salida' }));
    await user.type(screen.getByLabelText('Monto'), '25.50');
    await user.type(screen.getByLabelText('Motivo'), 'Compra de insumos');
    await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }));

    expect(registrar).toHaveBeenCalledWith({
      tipo: 'salida',
      monto: '25.50',
      motivo: 'Compra de insumos',
    });
  });

  it('valida el monto y el motivo del movimiento', async () => {
    const user = userEvent.setup();
    useCaja.mockReturnValue(crearEstado({
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
      sesionActual: { id_sesion_caja: 9, turno: 'mañana' },
    }));
    render(<CajaOperativa />);

    await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ingresa un monto mayor que cero con máximo dos decimales.',
    );
    expect(registrar).not.toHaveBeenCalled();
  });
});
