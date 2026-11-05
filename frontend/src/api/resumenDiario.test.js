import { beforeEach, expect, it, vi } from 'vitest';
import api from './axios';
import { obtenerVistaPrevia, crearCorte, enviarCorte, guardarConfiguracion, mensajeError } from './resumenDiario';
vi.mock('./axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue({ data: {} }); api.post.mockResolvedValue({ data: {} }); api.put.mockResolvedValue({ data: {} }); });
it('consulta exactamente las sucursales guardadas y permite cancelar la petición', async () => {
  const signal = new AbortController().signal;
  await obtenerVistaPrevia('2026-11-04', { todas_sucursales: false, sucursales: [1, 3] }, signal);
  expect(api.get).toHaveBeenCalledWith('/reportes/resumen-diario', { signal, params: { fecha: '2026-11-04', sucursales: '1,3' } });
});
it('al incluir todas no envía un filtro vacío que el backend rechazaría', async () => {
  await obtenerVistaPrevia('2026-11-04', { todas_sucursales: true, sucursales: [] });
  expect(api.get.mock.calls[0][1].params).toEqual({ fecha: '2026-11-04' });
});
it('separa crear el corte de encolar el envío', async () => {
  await crearCorte('2026-11-04'); await enviarCorte('12');
  expect(api.post.mock.calls).toEqual([
    ['/reportes/resumen-diario/historial', { fecha: '2026-11-04' }],
    ['/reportes/resumen-diario/historial/12/enviar', {}],
  ]);
});
it('conserva el mensaje del backend en fallos de descarga que llegan como Blob', async () => {
  const blob = new Blob(); blob.text = async () => JSON.stringify({ mensaje: 'Reporte no encontrado' });
  expect(await mensajeError({ response: { data: blob } }, 'Falla')).toBe('Reporte no encontrado');
});
