jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 8, id_sucursal: 3, rol: 'dependiente' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/ProductoService');
jest.mock('../services/HistorialPrecioLoteService');
jest.mock('../controllers/PromocionController');

const express = require('express');
const request = require('supertest');
const ProductoService = require('../services/ProductoService');
const HistorialPrecioLoteService = require('../services/HistorialPrecioLoteService');
const ProductoRoutes = require('./ProductoRoutes');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/productos', ProductoRoutes);
  app.use(errorHandler);
  return app;
};

const payloadBase = {
  codigo: 'MED010-TE',
  nombre_comercial: 'Termómetro digital',
  nombre_generico: 'Termómetro',
  id_presentacion: 1,
  id_categoria: 1,
  id_casa: 1,
  meses_alerta_vencimiento: 12,
};

describe('ProductoRoutes - concentración opcional', () => {
  beforeEach(() => {
    ProductoService.crearProducto.mockImplementation(async (datos) => datos);
    ProductoService.actualizarProducto.mockImplementation(async (_id, datos) => datos);
  });

  it('permite crear un producto sin enviar concentración', async () => {
    const respuesta = await request(crearApp())
      .post('/api/productos')
      .send(payloadBase);

    expect(respuesta.status).toBe(201);
    expect(ProductoService.crearProducto).toHaveBeenCalled();
    expect(respuesta.body).not.toHaveProperty('concentracion');
  });

  it('normaliza una concentración vacía a null', async () => {
    const respuesta = await request(crearApp())
      .post('/api/productos')
      .send({ ...payloadBase, concentracion: '   ' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.concentracion).toBeNull();
  });

  it('permite limpiar la concentración durante una actualización', async () => {
    const respuesta = await request(crearApp())
      .put('/api/productos/10')
      .send({ concentracion: null });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.concentracion).toBeNull();
  });

  it('rechaza una concentración que supera los 50 caracteres', async () => {
    const respuesta = await request(crearApp())
      .post('/api/productos')
      .send({ ...payloadBase, concentracion: 'a'.repeat(51) });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores[0].msg).toBe(
      'La concentración no puede superar los 50 caracteres',
    );
    expect(ProductoService.crearProducto).not.toHaveBeenCalled();
  });
});

describe('ProductoRoutes - autocompletado para POS', () => {
  beforeEach(() => {
    ProductoService.autocompletarParaPOS.mockResolvedValue([
      { id_producto: 5, id_lote: 12, nombre_comercial: 'Paracetamol' },
    ]);
  });

  it('busca productos usando la sucursal del usuario autenticado', async () => {
    const respuesta = await request(crearApp())
      .get('/api/productos/autocompletar')
      .query({ busqueda: '  para  ', limite: 5 });

    expect(respuesta.status).toBe(200);
    expect(ProductoService.autocompletarParaPOS).toHaveBeenCalledWith({
      busqueda: 'para',
      limite: 5,
      id_sucursal: 3,
    });
    expect(respuesta.body[0].id_lote).toBe(12);
  });

  it('rechaza una búsqueda vacía', async () => {
    const respuesta = await request(crearApp())
      .get('/api/productos/autocompletar')
      .query({ busqueda: '   ' });

    expect(respuesta.status).toBe(400);
    expect(ProductoService.autocompletarParaPOS).not.toHaveBeenCalled();
  });

  it('rechaza límites mayores a 20', async () => {
    const respuesta = await request(crearApp())
      .get('/api/productos/autocompletar')
      .query({ busqueda: 'para', limite: 21 });

    expect(respuesta.status).toBe(400);
    expect(ProductoService.autocompletarParaPOS).not.toHaveBeenCalled();
  });
});

describe('ProductoRoutes - historial de precios', () => {
  beforeEach(() => jest.clearAllMocks());

  it('expone el historial completo del producto en una sola solicitud', async () => {
    const historial = [{
      id_historial_precio: 2,
      id_lote: 8,
      numero_lote: 'LT-08',
      nombre_sucursal: 'Central',
    }];
    HistorialPrecioLoteService.obtenerPorProducto.mockResolvedValue(historial);

    const respuesta = await request(crearApp())
      .get('/api/productos/5/historial-precios');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(historial);
    expect(HistorialPrecioLoteService.obtenerPorProducto).toHaveBeenCalledWith(5);
  });

  it('rechaza identificadores de producto inválidos', async () => {
    const respuesta = await request(crearApp())
      .get('/api/productos/no-valido/historial-precios');

    expect(respuesta.status).toBe(400);
    expect(HistorialPrecioLoteService.obtenerPorProducto).not.toHaveBeenCalled();
  });
});
