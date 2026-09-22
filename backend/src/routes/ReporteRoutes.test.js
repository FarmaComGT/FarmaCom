let mockUsuario = { id_usuario: 2, id_sucursal: 1, rol: 'administrador' };

jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = mockUsuario;
  next();
});
jest.mock('../services/ReporteService');

const express = require('express');
const request = require('supertest');
const ReporteService = require('../services/ReporteService');
const ReporteRoutes = require('./ReporteRoutes');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reportes', ReporteRoutes);
  return app;
};

describe('ReporteRoutes - resumen de ventas', () => {
  beforeEach(() => {
    mockUsuario = { id_usuario: 2, id_sucursal: 1, rol: 'administrador' };
    ReporteService.obtenerResumenVentas.mockResolvedValue({
      ingresos_totales: '250.00',
      total_ventas: 6,
      ticket_promedio: '41.67',
      unidades_vendidas: 15,
    });
    ReporteService.obtenerTopProductos.mockResolvedValue([]);
    ReporteService.obtenerSerieVentas.mockResolvedValue([]);
    ReporteService.obtenerMetodosPago.mockResolvedValue([]);
    ReporteService.obtenerRentabilidad.mockResolvedValue([]);
  });

  it('rechaza el acceso de un dependiente', async () => {
    mockUsuario = { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' };

    const respuesta = await request(crearApp()).get('/api/reportes/ventas/resumen');

    expect(respuesta.status).toBe(403);
    expect(ReporteService.obtenerResumenVentas).not.toHaveBeenCalled();
  });

  it('valida y normaliza los filtros del resumen', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/ventas/resumen')
      .query({
        id_sucursal: 2,
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
      });

    expect(respuesta.status).toBe(200);
    expect(ReporteService.obtenerResumenVentas).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });
  });

  it('rechaza un rango de fechas invertido', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/ventas/resumen')
      .query({ fecha_desde: '2026-08-20', fecha_hasta: '2026-08-01' });

    expect(respuesta.status).toBe(400);
    expect(ReporteService.obtenerResumenVentas).not.toHaveBeenCalled();
  });

  it('valida y normaliza los filtros de la serie de ventas', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/ventas/serie')
      .query({
        id_sucursal: 2,
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
        agrupacion: 'semana',
      });

    expect(respuesta.status).toBe(200);
    expect(ReporteService.obtenerSerieVentas).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      agrupacion: 'semana',
    });
  });

  it('requiere ambas fechas para generar la serie', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/ventas/serie')
      .query({ fecha_desde: '2026-08-01', agrupacion: 'dia' });

    expect(respuesta.status).toBe(400);
    expect(ReporteService.obtenerSerieVentas).not.toHaveBeenCalled();
  });

  it('rechaza una agrupación desconocida', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/ventas/serie')
      .query({
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
        agrupacion: 'trimestre',
      });

    expect(respuesta.status).toBe(400);
    expect(ReporteService.obtenerSerieVentas).not.toHaveBeenCalled();
  });

  it('valida y normaliza los filtros de métodos de pago', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/ventas/metodos-pago')
      .query({
        id_sucursal: 2,
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
      });

    expect(respuesta.status).toBe(200);
    expect(ReporteService.obtenerMetodosPago).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });
  });

  it('valida y normaliza los filtros del top de productos', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/productos/top')
      .query({
        id_sucursal: 3,
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
        limite: 8,
        criterio: 'ingresos',
      });

    expect(respuesta.status).toBe(200);
    expect(ReporteService.obtenerTopProductos).toHaveBeenCalledWith({
      id_sucursal: 3,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      limite: 8,
      criterio: 'ingresos',
    });
  });

  it('rechaza un límite inválido para el top de productos', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/productos/top')
      .query({ limite: 21 });

    expect(respuesta.status).toBe(400);
    expect(ReporteService.obtenerTopProductos).not.toHaveBeenCalled();
  });

  it('rechaza un criterio desconocido para el top de productos', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/productos/top')
      .query({ criterio: 'margen' });

    expect(respuesta.status).toBe(400);
    expect(ReporteService.obtenerTopProductos).not.toHaveBeenCalled();
  });

  it('valida y normaliza los filtros de rentabilidad', async () => {
    const respuesta = await request(crearApp())
      .get('/api/reportes/rentabilidad')
      .query({
        id_sucursal: 2,
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
      });

    expect(respuesta.status).toBe(200);
    expect(ReporteService.obtenerRentabilidad).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });
  });

  it('rechaza el acceso de un dependiente al reporte de rentabilidad', async () => {
    mockUsuario = { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' };

    const respuesta = await request(crearApp()).get('/api/reportes/rentabilidad');

    expect(respuesta.status).toBe(403);
    expect(ReporteService.obtenerRentabilidad).not.toHaveBeenCalled();
  });
});
