import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResumenDiario from './ResumenDiario';
import * as api from '../../api/resumenDiario';
import { instalarAvisoCambiosResumen } from '../../hooks/useAvisoCambiosResumen';

instalarAvisoCambiosResumen();

const avisos = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => avisos }));
vi.mock('../../hooks/useSucursales', () => ({ default: () => ({ sucursales: [
  { id_sucursal: 1, nombre_sucursal: 'San Gabriel Centro' }, { id_sucursal: 2, nombre_sucursal: 'San Gabriel Norte' },
], cargando: false, error: null, refrescar: vi.fn() }) }));
vi.mock('../../api/resumenDiario');
const config = { correo_destinatario: 'dueno@example.com', automatico: false, hora_envio: '20:00', todas_sucursales: true, sucursales: [] };
const corte = { id_reporte: '12', fecha: '2026-11-04', corte: '2026-11-05T02:00:00Z', estado: 'provisional', origen: 'manual' };
const montar = (entrada = '/reports/resumen-diario?fecha=2026-11-04') => render(<MemoryRouter initialEntries={[entrada]}>
  <Link to="/otra">Otra pantalla</Link><Routes><Route path="/reports/resumen-diario" element={<ResumenDiario />} />
    <Route path="/otra" element={<p>Destino</p>} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  api.obtenerConfiguracion.mockResolvedValue({ ...config });
  api.guardarConfiguracion.mockImplementation(async (d) => d);
  api.obtenerVistaPrevia.mockResolvedValue({ ...corte, resumen: { ingresos: 100, ventas: 2, utilidad_bruta: 30, sesiones_abiertas: 1 } });
  api.obtenerHistorial.mockResolvedValue({ datos: [], paginacion: { total: 0 } });
  api.crearCorte.mockResolvedValue(corte);
  api.enviarCorte.mockResolvedValue({ estado: 'pendiente' });
  api.descargarCorte.mockResolvedValue(undefined);
  api.mensajeError.mockImplementation(async (_e, defecto) => defecto);
});
describe('Resumen diario', () => {
  it('muestra configuración, estado provisional y un historial vacío útil', async () => {
    montar();
    expect(await screen.findByDisplayValue('dueno@example.com')).toBeInTheDocument();
    expect(await screen.findByText('Provisional · 1 sesiones abiertas')).toBeInTheDocument();
    expect(await screen.findByText('Aún no hay cortes guardados')).toBeInTheDocument();
  });
  it('valida y enfoca el correo antes de activar el automático', async () => {
    const user = userEvent.setup(); montar();
    const correo = await screen.findByLabelText('Correo destinatario');
    await user.clear(correo);
    await user.click(screen.getByRole('checkbox', { name: /Enviar todos los días/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(correo).toHaveFocus();
    expect(screen.getByText('Ingresa un correo válido para recibir el resumen.')).toBeInTheDocument();
    expect(api.guardarConfiguracion).not.toHaveBeenCalled();
  });
  it('guarda la selección y recorta el correo sin enviar campos del servidor', async () => {
    const user = userEvent.setup(); montar();
    const correo = await screen.findByLabelText('Correo destinatario');
    await user.clear(correo); await user.type(correo, ' otro@example.com ');
    await user.click(screen.getByRole('checkbox', { name: 'Todas las sucursales' }));
    await user.click(screen.getByRole('checkbox', { name: 'San Gabriel Norte' }));
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    await waitFor(() => expect(api.guardarConfiguracion).toHaveBeenCalledWith({ ...config,
      correo_destinatario: 'otro@example.com', todas_sucursales: false, sucursales: [2] }));
    expect(avisos.success).toHaveBeenCalled();
  });
  it('bloquea generar un corte con configuración sin guardar y protege la navegación', async () => {
    const user = userEvent.setup(); montar();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      await user.type(await screen.findByLabelText('Correo destinatario'), '.nuevo');
      await user.click(screen.getByRole('button', { name: 'Enviar ahora' }));
      expect(api.crearCorte).not.toHaveBeenCalled();
      expect(avisos.warning).toHaveBeenCalled();
      await user.click(screen.getByRole('link', { name: 'Otra pantalla' }));
      expect(confirmar).toHaveBeenCalled();
      expect(screen.queryByText('Destino')).not.toBeInTheDocument();
    } finally { confirmar.mockRestore(); }
  });
  it('crea el corte y solicita el envío sin afirmar que fue entregado', async () => {
    const user = userEvent.setup(); montar();
    await screen.findByDisplayValue('dueno@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar ahora' }));
    await waitFor(() => expect(api.enviarCorte).toHaveBeenCalledWith('12'));
    expect(api.crearCorte).toHaveBeenCalledWith('2026-11-04');
    expect(avisos.info).toHaveBeenCalledWith(expect.stringContaining('Envío registrado'));
  });
  it('descarga un corte histórico sin volver a generarlo', async () => {
    const user = userEvent.setup();
    api.obtenerHistorial.mockResolvedValue({ datos: [{ ...corte, envio: { estado: 'aceptado' } }], paginacion: { total: 1 } });
    montar(); await user.click(await screen.findByRole('button', { name: 'Descargar PDF del corte 12' }));
    expect(api.descargarCorte).toHaveBeenCalledWith('12');
    expect(api.crearCorte).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Enviar del corte 12' })).not.toBeInTheDocument();
  });
  it('recupera el historial tras un error', async () => {
    const user = userEvent.setup(); api.obtenerHistorial.mockRejectedValueOnce(new Error('Falla'));
    montar();
    await screen.findByText('No se pudo cargar el historial.');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aún no hay cortes guardados')).toBeInTheDocument();
  });
  it('conserva la tabla si falla una actualización del historial', async () => {
    const user = userEvent.setup();
    api.obtenerHistorial.mockResolvedValue({ datos: [{ ...corte, envio: { estado: 'aceptado' } }], paginacion: { total: 1 } });
    montar();
    await screen.findByRole('button', { name: 'Descargar PDF del corte 12' });
    api.obtenerHistorial.mockRejectedValueOnce(new Error('Falla temporal'));
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await screen.findByText('No se pudo cargar el historial.');
    expect(screen.getByRole('button', { name: 'Descargar PDF del corte 12' })).toBeInTheDocument();
  });
  it('permite borrar una fecha incompleta y muestra validación sin resetearla', async () => {
    const user = userEvent.setup(); montar();
    const input = screen.getByLabelText('Fecha del reporte');
    await user.clear(input);
    expect(input).toHaveValue('');
    expect(screen.getByText('Selecciona una fecha válida, hasta hoy.')).toBeInTheDocument();
  });
  it('muestra errores y recuperación de un envío fallido desde un enlace directo', async () => {
    api.obtenerEnvios.mockResolvedValue([{ id_envio: '3', destinatario: 'dueno@example.com', estado: 'fallido', intentos: 3, error: 'Error temporal de correo.' }]);
    montar('/reports/resumen-diario?fecha=2026-11-04&detalle=12');
    const detalle = await screen.findByRole('region', { name: 'Envío del corte 12' });
    expect(await within(detalle).findByText('Error temporal de correo.')).toBeInTheDocument();
    expect(within(detalle).getByRole('link', { name: 'Cerrar detalle' })).toBeInTheDocument();
  });
  it('intercepta Atrás antes de desmontar un formulario modificado', async () => {
    const user = userEvent.setup();
    window.history.replaceState({ idx: 2 }, '', '/reports/resumen-diario?fecha=2026-11-04');
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const regresar = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    try {
      render(<BrowserRouter><Routes><Route path="/reports/resumen-diario" element={<ResumenDiario />} /><Route path="/otra" element={<p>Destino externo</p>} /></Routes></BrowserRouter>);
      const correo = await screen.findByLabelText('Correo destinatario');
      await user.type(correo, '.pendiente');
      window.history.replaceState({ idx: 1 }, '', '/otra');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 1 } }));
      expect(confirmar).toHaveBeenCalled();
      expect(regresar).toHaveBeenCalledWith(1);
      expect(correo).toHaveValue('dueno@example.com.pendiente');
      expect(screen.queryByText('Destino externo')).not.toBeInTheDocument();
    } finally { confirmar.mockRestore(); regresar.mockRestore(); window.history.replaceState(null, '', '/'); }
  });
});
