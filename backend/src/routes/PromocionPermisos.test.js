jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = {
    id_usuario: 9,
    rol: req.get('x-test-role') || 'dueno',
  };
  next();
});
jest.mock('../services/PromocionService');

const express = require('express');
const request = require('supertest');
const PromocionService = require('../services/PromocionService');
const ProductoRoutes = require('./ProductoRoutes');
const PromocionRoutes = require('./PromocionRoutes');
const errorHandler = require('../middlewares/errorHandler');

const promocionValida = {
  id_sucursal: 1,
  cantidad_minima: 3,
  precio_promocion: 7.5,
  fecha_inicio: '2026-10-01',
  fecha_fin: '2026-12-31',
};

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/productos', ProductoRoutes);
  app.use('/api/promociones', PromocionRoutes);
  app.use(errorHandler);
  return app;
};

describe('permisos de promociones', () => {
  beforeEach(() => {
    PromocionService.crearPromocion.mockResolvedValue({ id_promocion: 1 });
    PromocionService.obtenerPorProducto.mockResolvedValue([]);
    PromocionService.obtenerPorId.mockResolvedValue({ id_promocion: 1 });
    PromocionService.actualizarPromocion.mockResolvedValue({ id_promocion: 1 });
    PromocionService.cambiarEstadoPromocion.mockResolvedValue({ mensaje: 'Promoción actualizada' });
    PromocionService.eliminarPromocion.mockResolvedValue({ mensaje: 'Promoción eliminada' });
  });

  it.each(['dueno', 'administrador'])('permite crear promociones al rol %s', async (rol) => {
    const respuesta = await request(crearApp())
      .post('/api/productos/4/promociones')
      .set('x-test-role', rol)
      .send(promocionValida);

    expect(respuesta.status).toBe(201);
    expect(PromocionService.crearPromocion).toHaveBeenCalled();
  });

  it('permite al dependiente consultar promociones', async () => {
    const app = crearApp();
    const listado = await request(app)
      .get('/api/productos/4/promociones')
      .set('x-test-role', 'dependiente');
    const detalle = await request(app)
      .get('/api/promociones/1')
      .set('x-test-role', 'dependiente');

    expect(listado.status).toBe(200);
    expect(detalle.status).toBe(200);
  });

  it.each([
    ['post', '/api/productos/4/promociones', promocionValida],
    ['put', '/api/promociones/1', { precio_promocion: 6 }],
    ['patch', '/api/promociones/1/estado', { activo: false }],
    ['delete', '/api/promociones/1', undefined],
  ])('impide al dependiente administrar promociones con %s %s', async (metodo, ruta, datos) => {
    let solicitud = request(crearApp())[metodo](ruta).set('x-test-role', 'dependiente');
    if (datos !== undefined) solicitud = solicitud.send(datos);

    const respuesta = await solicitud;

    expect(respuesta.status).toBe(403);
  });

  it('impide a roles ajenos consultar promociones', async () => {
    const respuesta = await request(crearApp())
      .get('/api/promociones/1')
      .set('x-test-role', 'laboratorista');

    expect(respuesta.status).toBe(403);
    expect(PromocionService.obtenerPorId).not.toHaveBeenCalled();
  });
});
