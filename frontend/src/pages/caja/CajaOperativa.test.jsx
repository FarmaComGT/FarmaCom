import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
const cerrar = vi.fn();
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
  cerrar,
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
    expect(screen.queryByText('Efectivo esperado')).not.toBeInTheDocument();
    expect(screen.queryByText('Diferencia')).not.toBeInTheDocument();
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

  it('exige una nota antes de permitir el cierre', async () => {
    const user = userEvent.setup();
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

    await user.type(screen.getByLabelText('Efectivo contado'), '250.00');
    await user.click(screen.getByRole('button', { name: 'Cerrar turno' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ingresa una nota de cierre antes de continuar.',
    );
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('solicita confirmación sin mostrar el efectivo esperado ni la diferencia', async () => {
    const user = userEvent.setup();
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

    await user.type(screen.getByLabelText('Efectivo contado'), '250.00');
    await user.type(screen.getByLabelText(/Nota de cierre/), 'Conteo físico completado');
    await user.click(screen.getByRole('button', { name: 'Cerrar turno' }));

    const dialogo = screen.getByRole('dialog', { name: 'Confirmar cierre de turno' });
    expect(within(dialogo).getByText(/Q\s*250\.00/)).toBeInTheDocument();
    expect(within(dialogo).queryByText('Efectivo esperado')).not.toBeInTheDocument();
    expect(within(dialogo).queryByText('Diferencia')).not.toBeInTheDocument();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('cierra una caja cuadrada después de confirmar el conteo', async () => {
    const user = userEvent.setup();
    cerrar.mockResolvedValue({
      id_sesion_caja: 9,
      resultado: 'cuadrada',
      efectivo_esperado: '250.00',
      efectivo_contado: '250.00',
      diferencia_efectivo: '0.00',
    });
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

    await user.type(screen.getByLabelText('Efectivo contado'), '250.00');
    await user.type(screen.getByLabelText(/Nota de cierre/), 'Conteo físico completado');
    await user.click(screen.getByRole('button', { name: 'Cerrar turno' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    expect(cerrar).toHaveBeenCalledWith({
      efectivo_contado: '250.00',
      observaciones: 'Conteo físico completado',
    });
    expect(screen.getByRole('heading', { name: 'Caja cuadrada' })).toBeInTheDocument();
  });

  it('presenta el faltante devuelto al cerrar la sesión', async () => {
    const user = userEvent.setup();
    cerrar.mockResolvedValue({
      id_sesion_caja: 9,
      resultado: 'faltante',
      efectivo_esperado: '250.00',
      efectivo_contado: '245.00',
      diferencia_efectivo: '-5.00',
    });
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

    await user.type(screen.getByLabelText('Efectivo contado'), '245.00');
    await user.type(screen.getByLabelText(/Nota de cierre/), 'Conteo físico completado');
    await user.click(screen.getByRole('button', { name: 'Cerrar turno' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    expect(cerrar).toHaveBeenCalledWith({
      efectivo_contado: '245.00',
      observaciones: 'Conteo físico completado',
    });
    expect(screen.getByRole('heading', { name: 'Faltante de efectivo' }))
      .toBeInTheDocument();
    expect(screen.getByText(/faltante de/)).toHaveTextContent(/Q\s*5\.00/);
  });
});
