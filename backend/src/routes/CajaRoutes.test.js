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
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/cajas', CajaRoutes);
  app.use(errorHandler);
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

  describe('administración de cajas', () => {
    it('crea una caja en una sucursal', async () => {
      CajaService.crearCaja.mockResolvedValue({ id_caja: 4, nombre: 'Caja 2' });

      const respuesta = await request(crearApp())
        .post('/api/cajas')
        .send({ id_sucursal: '1', nombre: '  Caja 2  ' });

      expect(respuesta.status).toBe(201);
      expect(CajaService.crearCaja).toHaveBeenCalledWith({ id_sucursal: 1, nombre: 'Caja 2' });
    });

    it('rechaza crear una caja sin nombre', async () => {
      const respuesta = await request(crearApp()).post('/api/cajas').send({ id_sucursal: 1, nombre: ' ' });

      expect(respuesta.status).toBe(400);
      expect(CajaService.crearCaja).not.toHaveBeenCalled();
    });

    it('lista cajas convirtiendo los filtros de la consulta', async () => {
      CajaService.obtenerCajas.mockResolvedValue([{ id_caja: 1 }]);

      const respuesta = await request(crearApp()).get('/api/cajas?id_sucursal=2&activa=true');

      expect(respuesta.status).toBe(200);
      expect(CajaService.obtenerCajas).toHaveBeenCalledWith(
        { id_sucursal: 2, activa: true },
        expect.objectContaining({ id_usuario: 7 }),
      );
    });

    it('rechaza un filtro activa inválido', async () => {
      const respuesta = await request(crearApp()).get('/api/cajas?activa=quizas');

      expect(respuesta.status).toBe(400);
    });

    it('desactiva una caja', async () => {
      CajaService.actualizarCaja.mockResolvedValue({ id_caja: 4, activa: false });

      const respuesta = await request(crearApp()).patch('/api/cajas/4').send({ activa: false });

      expect(respuesta.status).toBe(200);
      expect(CajaService.actualizarCaja).toHaveBeenCalledWith(
        4,
        { activa: false },
        expect.objectContaining({ id_usuario: 7 }),
      );
    });

    it('exige nombre o activa al editar una caja', async () => {
      const respuesta = await request(crearApp()).patch('/api/cajas/4').send({});

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.errores[0].msg).toBe('Debes enviar nombre o activa');
      expect(CajaService.actualizarCaja).not.toHaveBeenCalled();
    });
  });

  describe('turnos', () => {
    it.each(['tarde', 'noche'])('acepta abrir el turno de %s', async (turno) => {
      CajaService.abrirSesion.mockResolvedValue({ id_sesion_caja: 9, turno });

      const respuesta = await request(crearApp())
        .post('/api/cajas/3/sesiones')
        .send({ turno, fondo_inicial: '0' });

      expect(respuesta.status).toBe(201);
    });

    it('rechaza un fondo inicial negativo', async () => {
      const respuesta = await request(crearApp())
        .post('/api/cajas/3/sesiones')
        .send({ turno: 'mañana', fondo_inicial: '-5' });

      expect(respuesta.status).toBe(400);
      expect(CajaService.abrirSesion).not.toHaveBeenCalled();
    });

    it('consulta el turno abierto de una caja', async () => {
      CajaService.obtenerSesionActual.mockResolvedValue({ id_sesion_caja: 9, turno: 'tarde' });

      const respuesta = await request(crearApp()).get('/api/cajas/3/sesion-actual');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ id_sesion_caja: 9, turno: 'tarde' });
      expect(CajaService.obtenerSesionActual).toHaveBeenCalledWith(3, expect.objectContaining({ id_usuario: 7 }));
    });

    it('registra una salida de efectivo del turno', async () => {
      CajaService.registrarMovimiento.mockResolvedValue({ id_movimiento: 2 });
      const movimiento = { tipo: 'salida', monto: '25.50', motivo: 'Compra de bolsas' };

      const respuesta = await request(crearApp()).post('/api/cajas/sesiones/9/movimientos').send(movimiento);

      expect(respuesta.status).toBe(201);
      expect(CajaService.registrarMovimiento).toHaveBeenCalledWith(
        9,
        movimiento,
        expect.objectContaining({ id_usuario: 7 }),
      );
    });

    it.each([
      ['un tipo desconocido', { tipo: 'retiro', monto: '10', motivo: 'x' }],
      ['un monto de cero', { tipo: 'entrada', monto: '0', motivo: 'x' }],
      ['un motivo vacío', { tipo: 'entrada', monto: '10', motivo: '  ' }],
    ])('rechaza un movimiento con %s', async (_caso, cuerpo) => {
      const respuesta = await request(crearApp()).post('/api/cajas/sesiones/9/movimientos').send(cuerpo);

      expect(respuesta.status).toBe(400);
      expect(CajaService.registrarMovimiento).not.toHaveBeenCalled();
    });
  });

  describe('historial de cierres', () => {
    it('lista cierres con filtros de caja y fechas', async () => {
      CajaService.obtenerCierres.mockResolvedValue([{ id_cierre: 1 }]);

      const respuesta = await request(crearApp())
        .get('/api/cajas/cierres?id_sucursal=1&id_caja=3&fecha_desde=2026-10-01&fecha_hasta=2026-10-31');

      expect(respuesta.status).toBe(200);
      expect(CajaService.obtenerCierres).toHaveBeenCalledWith({
        id_sucursal: 1,
        id_caja: 3,
        fecha_desde: '2026-10-01',
        fecha_hasta: '2026-10-31',
      });
    });

    it.each(['2026-13-01', '01/10/2026'])('rechaza la fecha %s', async (fecha) => {
      const respuesta = await request(crearApp()).get(`/api/cajas/cierres?fecha_desde=${encodeURIComponent(fecha)}`);

      expect(respuesta.status).toBe(400);
      expect(CajaService.obtenerCierres).not.toHaveBeenCalled();
    });
  });

  it('envía al manejador de errores lo que rechace el servicio', async () => {
    const AppError = require('../errors/AppError');
    CajaService.abrirSesion.mockRejectedValue(new AppError('La caja ya tiene un turno abierto', 409));

    const respuesta = await request(crearApp())
      .post('/api/cajas/3/sesiones')
      .send({ turno: 'mañana', fondo_inicial: '100' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({ mensaje: 'La caja ya tiene un turno abierto' });
  });
});
