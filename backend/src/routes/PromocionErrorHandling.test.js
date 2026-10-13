jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 1, rol: 'dependiente' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/PromocionService');

const request = require('supertest');
const express = require('express');
const AppError = require('../errors/AppError');
const ProductoRoutes = require('./ProductoRoutes');
const PromocionRoutes = require('./PromocionRoutes');
const PromocionService = require('../services/PromocionService');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/productos', ProductoRoutes);
app.use('/api/promociones', PromocionRoutes);
app.use(errorHandler);

const promocionValida = {
  id_sucursal: 1,
  cantidad_minima: 5,
  precio_promocion: 10,
  fecha_inicio: '2026-11-01',
  fecha_fin: '2026-11-30',
};

describe('manejo centralizado de Promoción', () => {
  it('mantiene la respuesta exitosa de la ruta anidada de creación', async () => {
    const promocion = { id_promocion: 1, ...promocionValida };
    PromocionService.crearPromocion.mockResolvedValue(promocion);

    const respuesta = await request(app)
      .post('/api/productos/4/promociones')
      .send(promocionValida);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual(expect.objectContaining({ id_promocion: 1 }));
    expect(PromocionService.crearPromocion).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ cantidad_minima: 5, precio_promocion: 10 }),
    );
  });

  it('detiene una promoción inválida antes de llamar al servicio', async () => {
    const respuesta = await request(app)
      .post('/api/productos/4/promociones')
      .send({ ...promocionValida, cantidad_minima: 0 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      mensaje: 'La solicitud contiene datos inválidos.',
      errores: expect.arrayContaining([
        expect.objectContaining({
          path: 'cantidad_minima',
          msg: 'La cantidad mínima debe ser mayor a 0',
        }),
      ]),
    });
    expect(PromocionService.crearPromocion).not.toHaveBeenCalled();
  });

  it('rechaza un ID inválido antes de consultar la promoción', async () => {
    const respuesta = await request(app).get('/api/promociones/no-es-id');

    expect(respuesta.status).toBe(400);
    expect(PromocionService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('delega al middleware un error operacional del servicio', async () => {
    PromocionService.obtenerPorId.mockRejectedValue(
      new AppError('Promoción no encontrada', 404),
    );

    const respuesta = await request(app).get('/api/promociones/999');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Promoción no encontrada' });
  });

  it('conserva la regla que impide reactivar una promoción', async () => {
    const respuesta = await request(app)
      .patch('/api/promociones/1/estado')
      .send({ activo: true });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      mensaje: 'Para activar una promoción, créela nuevamente',
    });
    expect(PromocionService.desactivarPromocion).not.toHaveBeenCalled();
  });
});
