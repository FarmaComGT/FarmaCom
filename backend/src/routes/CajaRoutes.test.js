jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/CajaService');

const express = require('express');
const request = require('supertest');
const CajaService = require('../services/CajaService');
const CajaRoutes = require('./CajaRoutes');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/cajas', CajaRoutes);
  return app;
};

describe('CajaRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acepta una apertura con turno de mañana y fondo válido', async () => {
    CajaService.abrirSesion.mockResolvedValue({ id_sesion_caja: 9 });

    const respuesta = await request(crearApp())
      .post('/api/cajas/3/sesiones')
      .send({ turno: 'mañana', fondo_inicial: '100.00' });

    expect(respuesta.status).toBe(201);
    expect(CajaService.abrirSesion).toHaveBeenCalledWith(
      3,
      { turno: 'mañana', fondo_inicial: '100.00' },
      expect.objectContaining({ id_usuario: 7 }),
    );
  });

  it('rechaza turnos desconocidos', async () => {
    const respuesta = await request(crearApp())
      .post('/api/cajas/3/sesiones')
      .send({ turno: 'madrugada', fondo_inicial: '100.00' });

    expect(respuesta.status).toBe(400);
    expect(CajaService.abrirSesion).not.toHaveBeenCalled();
  });

  it('envía al servicio solo el conteo y las observaciones del cierre', async () => {
    CajaService.cerrarSesion.mockResolvedValue({
      id_sesion_caja: 9,
      efectivo_esperado: '100.00',
      efectivo_contado: '100.00',
    });

    const respuesta = await request(crearApp())
      .post('/api/cajas/sesiones/9/cierre')
      .send({ efectivo_contado: '100.00', observaciones: null });

    expect(respuesta.status).toBe(200);
    expect(CajaService.cerrarSesion).toHaveBeenCalledWith(
      9,
      { efectivo_contado: '100.00', observaciones: null },
      expect.objectContaining({ id_usuario: 7 }),
    );
  });

  it('rechaza montos de cierre con más de dos decimales', async () => {
    const respuesta = await request(crearApp())
      .post('/api/cajas/sesiones/9/cierre')
      .send({ efectivo_contado: '100.001' });

    expect(respuesta.status).toBe(400);
    expect(CajaService.cerrarSesion).not.toHaveBeenCalled();
  });

  it('envía la sucursal y la caja opcional al resumen diario', async () => {
    CajaService.obtenerResumenDiario.mockResolvedValue([]);

    const respuesta = await request(crearApp())
      .get('/api/cajas/cierres/resumen-diario')
      .query({ fecha: '2026-09-28', id_sucursal: 2, id_caja: 3 });

    expect(respuesta.status).toBe(200);
    expect(CajaService.obtenerResumenDiario).toHaveBeenCalledWith('2026-09-28', 2, 3);
  });

  it('exige una sucursal para consultar el resumen diario', async () => {
    const respuesta = await request(crearApp())
      .get('/api/cajas/cierres/resumen-diario')
      .query({ fecha: '2026-09-28' });

    expect(respuesta.status).toBe(400);
    expect(CajaService.obtenerResumenDiario).not.toHaveBeenCalled();
  });
});
