jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { rol: 'administrador', id_usuario: 1 }; next();
});
jest.mock('../services/PromocionService');
jest.mock('../services/ProductoService');
const express = require('express');
const request = require('supertest');
const service = require('../services/PromocionService');
const router = require('./PromocionRoutes');
const errorHandler = require('../middlewares/errorHandler');
const productoService = require('../services/ProductoService');
const productoRouter = require('./ProductoRoutes');
const app = express(); app.use(express.json()); app.use('/promociones', router); app.use('/productos', productoRouter); app.use(errorHandler);

beforeEach(() => jest.clearAllMocks());
it.each([0, -2, 1.1, 2147483648, [], {}])('rechaza una cantidad máxima inválida: %j', async (cantidad_maxima) => {
  expect((await request(app).put('/promociones/1').send({ cantidad_maxima })).status).toBe(400);
  expect(service.actualizarPromocion).not.toHaveBeenCalled();
});
it('permite un cupo opcional y filtrar las promociones agotadas', async () => {
  service.actualizarPromocion.mockResolvedValue({}); service.obtenerTodas.mockResolvedValue([]);
  expect((await request(app).put('/promociones/1').send({ cantidad_maxima: 100 })).status).toBe(200);
  expect((await request(app).put('/promociones/1').send({ cantidad_maxima: null })).status).toBe(200);
  expect((await request(app).get('/promociones?estado=agotada')).status).toBe(200);
});
it('consulta el listado general sin exigir un producto', async () => {
  service.obtenerTodas.mockResolvedValue({ datos: [], paginacion: { total: 0 } });
  const respuesta = await request(app).get('/promociones?busqueda=Mayoreo&estado=vigente&id_sucursal=2&pagina=1&limite=25');
  expect(respuesta.status).toBe(200);
  expect(service.obtenerTodas).toHaveBeenCalledWith({ busqueda: 'Mayoreo', estado: 'vigente', id_sucursal: 2, pagina: 1, limite: 25 }, expect.objectContaining({ rol: 'administrador' }));
});
it.each(['estado=otro', 'pagina=0', 'id_sucursal[]=2', 'busqueda[]=x', 'limite=101', 'id_producto=-1'])('rechaza filtros inválidos: %s', async (query) => {
  expect((await request(app).get('/promociones?' + query)).status).toBe(400);
  expect(service.obtenerTodas).not.toHaveBeenCalled();
});
it('permite limpiar el nombre y la fecha final explícitamente', async () => {
  service.actualizarPromocion.mockResolvedValue({ id_promocion: 1, nombre: null, fecha_fin: null });
  expect((await request(app).put('/promociones/1').send({ nombre: null, fecha_fin: null })).status).toBe(200);
  expect(service.actualizarPromocion).toHaveBeenCalledWith(1, { nombre: null, fecha_fin: null });
});
it('rechaza nombres demasiado largos', async () => {
  expect((await request(app).put('/promociones/1').send({ nombre: 'x'.repeat(121) })).status).toBe(400);
});

it('crea con nombre opcional y sin fecha de fin', async () => {
  service.crearPromocion.mockImplementation(async (id, datos) => ({ id_promocion: 1, id_producto: id, ...datos }));
  const respuesta = await request(app).post('/productos/4/promociones').send({ nombre: ' Mayoreo ', id_sucursal: 1, cantidad_minima: 6, precio_promocion: 8, fecha_inicio: '2026-01-01', fecha_fin: null });
  expect(respuesta.status).toBe(201);
  expect(service.crearPromocion).toHaveBeenCalledWith(4, expect.objectContaining({ nombre: 'Mayoreo', fecha_fin: null }));
});

it('ofrece una búsqueda limitada de productos para configurar promociones', async () => {
  productoService.buscarParaSeleccion.mockResolvedValue([{ id_producto: 4 }]);
  expect((await request(app).get('/productos/seleccion?busqueda=Paracetamol&limite=10')).status).toBe(200);
  expect(productoService.buscarParaSeleccion).toHaveBeenCalledWith('Paracetamol', 10);
  expect((await request(app).get('/productos/seleccion?busqueda=Paracetamol&limite=1000')).status).toBe(400);
});

it('resuelve una lectura exacta sin convertir el código a número', async () => {
  productoService.seleccionarPorLectura.mockResolvedValue({ id_producto: 4, codigo_barras: '000123' });
  expect((await request(app).get('/productos/seleccion/lectura?codigo=000123')).status).toBe(200);
  expect(productoService.seleccionarPorLectura).toHaveBeenCalledWith('000123');
  expect((await request(app).get('/productos/seleccion/lectura?codigo[]=123')).status).toBe(400);
});
