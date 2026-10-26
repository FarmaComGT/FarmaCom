// Se ejercitan rutas, validadores, controladores y servicios reales.
// Solo se sustituyen los DAO para comprobar el contrato HTTP sin una base de datos.
jest.mock('../daos/ProductoDAO');
jest.mock('../daos/PresentacionDAO');
jest.mock('../daos/CasaFarmaceuticaDAO');
jest.mock('../daos/ProveedorDAO');
jest.mock('../daos/LoteDAO');
jest.mock('../daos/HistorialPrecioLoteDAO');
jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 9, id_sucursal: 3, rol: 'administrador' };
  next();
});

const express = require('express');
const request = require('supertest');
const ProductoDAO = require('../daos/ProductoDAO');
const PresentacionDAO = require('../daos/PresentacionDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const LoteDAO = require('../daos/LoteDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const ProductoRoutes = require('./ProductoRoutes');
const LoteRoutes = require('./LoteRoutes');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/productos', ProductoRoutes);
app.use('/api/lotes', LoteRoutes);
app.use(errorHandler);

const producto = {
  id_producto: 2, codigo: 'MED002-TA', nombre_comercial: 'Paracetamol',
  nombre_generico: 'Acetaminofén', concentracion: '500 mg', id_presentacion: 1,
  id_categoria: 1, id_casa: 1, id_proveedor: 1, stock_minimo: 5,
  meses_alerta_vencimiento: 6, aplica_mayoreo: true, activo: true,
};
const datosProducto = {
  codigo: ' MED003-TA ', nombre_comercial: ' Paracetamol ', nombre_generico: ' Acetaminofén ',
  concentracion: ' 500 mg ', id_presentacion: '1', id_categoria: '1', id_casa: '1',
  id_proveedor: '1', stock_minimo: '0', meses_alerta_vencimiento: '6', aplica_mayoreo: 'false',
};
const lote = {
  id_lote: 7, id_producto: 2, id_proveedor: 1, id_sucursal: 3,
  numero_lote: 'LT-007', fecha_vencimiento: null, cantidad_ingresada: 20,
  stock_actual: 12, precio_compra: 10, precio_venta: 12.5, margen_ganancia: 25,
  precio_mayoreo: 11, cantidad_mayoreo: 5,
};
const datosLote = {
  id_producto: '2', id_proveedor: '1', id_sucursal: '3', numero_lote: ' LT-NUEVO ',
  fecha_vencimiento: '2099-12-31', cantidad_ingresada: '20',
  precio_compra: '10.50', precio_venta: '12.60', margen_ganancia: '20',
  precio_mayoreo: '11.00', cantidad_mayoreo: '5',
};
const client = {};

describe('regresión de errores centralizados y validaciones extraídas', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ProductoDAO.obtenerPorId.mockResolvedValue(producto);
    ProductoDAO.obtenerPorCodigo.mockResolvedValue(null);
    ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
    PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Tableta' });
    CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1, activo: true });
    ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, activo: true });
    LoteDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion(client));
    LoteDAO.obtenerFilaPorId.mockResolvedValue(lote);
    LoteDAO.obtenerPorId.mockResolvedValue(lote);
  });

  it('conserva el 201, el JSON y la normalización al crear un producto', async () => {
    const normalizado = {
      codigo: 'MED003-TA', nombre_comercial: 'Paracetamol', nombre_generico: 'Acetaminofén',
      concentracion: '500 mg', id_presentacion: 1, id_categoria: 1, id_casa: 1,
      id_proveedor: 1, stock_minimo: 0, meses_alerta_vencimiento: 6, aplica_mayoreo: false,
    };
    const creado = { id_producto: 3, ...normalizado };
    ProductoDAO.crear.mockResolvedValue({ id_producto: 3 });
    ProductoDAO.obtenerPorId.mockResolvedValue(creado);

    const respuesta = await request(app).post('/api/productos').send(datosProducto);

    expect(respuesta.status).toBe(201);
    expect(respuesta.headers['content-type']).toMatch(/application\/json/);
    expect(respuesta.body).toEqual(creado);
    expect(ProductoDAO.crear).toHaveBeenCalledWith(normalizado);
  });

  it.each([
    ['nombre_comercial', ' ', 'El nombre comercial es requerido'],
    ['id_presentacion', 0, 'id_presentacion debe ser un entero positivo'],
    ['stock_minimo', -1, 'El stock mínimo debe ser mayor o igual a 0'],
    ['meses_alerta_vencimiento', 0, 'Los meses de alerta deben ser mayor a 0'],
    ['concentracion', 123, 'La concentración debe ser texto'],
  ])('rechaza %s inválido antes de consultar o escribir datos', async (campo, valor, mensaje) => {
    const respuesta = await request(app).post('/api/productos').send({ ...datosProducto, [campo]: valor });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      mensaje: 'La solicitud contiene datos inválidos.',
      errores: expect.arrayContaining([{ type: 'field', location: 'body', path: campo, msg: mensaje }]),
    });
    expect(PresentacionDAO.obtenerPorId).not.toHaveBeenCalled();
    expect(ProductoDAO.crear).not.toHaveBeenCalled();
  });

  it('conserva las actualizaciones parciales, null, cero y false en productos', async () => {
    const cambios = { nombre_comercial: 'Nuevo nombre', concentracion: null, id_proveedor: null, stock_minimo: 0, aplica_mayoreo: false };
    const actualizado = { ...producto, ...cambios };
    ProductoDAO.actualizar.mockResolvedValue(true);
    ProductoDAO.obtenerPorId.mockResolvedValueOnce(producto).mockResolvedValueOnce(actualizado);

    const respuesta = await request(app).put('/api/productos/2').send({
      ...cambios, nombre_comercial: ' Nuevo nombre ', concentracion: ' ', stock_minimo: '0', aplica_mayoreo: 'false',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(actualizado);
    expect(ProductoDAO.actualizar).toHaveBeenCalledWith(2, cambios);
  });

  it('mantiene la conversión del booleano textual al desactivar un producto', async () => {
    const desactivado = { ...producto, activo: false };
    ProductoDAO.cambiarActivo.mockResolvedValue(true);
    ProductoDAO.obtenerPorId.mockResolvedValueOnce(producto).mockResolvedValueOnce(desactivado);

    const respuesta = await request(app).patch('/api/productos/2/estado').send({ activo: 'false' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ mensaje: 'Producto desactivado correctamente', producto: desactivado });
    expect(ProductoDAO.cambiarActivo).toHaveBeenCalledWith(2, false);
  });

  it('conserva los parámetros normalizados y la sucursal en el autocompletado', async () => {
    const resultados = [{ id_producto: 2, id_lote: 7, nombre_comercial: 'Paracetamol' }];
    ProductoDAO.autocompletarParaPOS.mockResolvedValue(resultados);

    const respuesta = await request(app).get('/api/productos/autocompletar').query({ busqueda: ' para ', limite: '5' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(resultados);
    expect(ProductoDAO.autocompletarParaPOS).toHaveBeenCalledWith('para', 3, 5);
  });

  it('conserva el 201 y convierte fechas, identificadores y precios del lote', async () => {
    const normalizado = {
      id_producto: 2, id_proveedor: 1, id_sucursal: 3, numero_lote: 'LT-NUEVO',
      fecha_vencimiento: new Date('2099-12-31'), cantidad_ingresada: 20,
      precio_compra: 10.5, precio_venta: 12.6, margen_ganancia: 20,
      precio_mayoreo: 11, cantidad_mayoreo: 5,
    };
    const creado = { id_lote: 8, ...normalizado, stock_actual: 20 };
    LoteDAO.crear.mockResolvedValue(creado);
    LoteDAO.obtenerPorId.mockResolvedValue(creado);

    const respuesta = await request(app).post('/api/lotes').send(datosLote);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ ...creado, fecha_vencimiento: '2099-12-31T00:00:00.000Z' });
    expect(LoteDAO.crear).toHaveBeenCalledWith(normalizado, client);
    expect(HistorialPrecioLoteDAO.registrarPorIngreso).toHaveBeenCalledWith(undefined, creado, 9, client);
  });

  it.each([
    ['cantidad_ingresada', '0', 'cantidad_ingresada debe ser un entero mayor a 0'],
    ['precio_compra', '-1', 'precio_compra es requerido y debe ser mayor o igual a 0'],
    ['margen_ganancia', '10000', 'margen_ganancia debe estar entre 0 y 9999.9999'],
    ['fecha_vencimiento', 'no-es-fecha', 'fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD)'],
  ])('bloquea %s inválido antes de iniciar la transacción del lote', async (campo, valor, mensaje) => {
    const respuesta = await request(app).post('/api/lotes').send({ ...datosLote, [campo]: valor });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      mensaje: 'La solicitud contiene datos inválidos.',
      errores: expect.arrayContaining([{ type: 'field', location: 'body', path: campo, msg: mensaje }]),
    });
    expect(LoteDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
    expect(LoteDAO.crear).not.toHaveBeenCalled();
  });

  it('permite poner el stock en cero y quitar el vencimiento sin cambiar otros campos', async () => {
    const cambios = { stock_actual: 0, fecha_vencimiento: null };
    const actualizado = { ...lote, ...cambios };
    LoteDAO.actualizar.mockResolvedValue(true);
    LoteDAO.obtenerPorId.mockResolvedValue(actualizado);

    const respuesta = await request(app).patch('/api/lotes/7').send({ stock_actual: '0', fecha_vencimiento: null });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(actualizado);
    expect(LoteDAO.actualizar).toHaveBeenCalledWith(7, cambios, client);
  });

  it('conserva la limpieza explícita del mayoreo al actualizar un lote', async () => {
    LoteDAO.actualizar.mockResolvedValue(true);
    const actualizado = { ...lote, precio_mayoreo: null, cantidad_mayoreo: null };
    LoteDAO.obtenerPorId.mockResolvedValue(actualizado);

    const respuesta = await request(app).patch('/api/lotes/7').send({
      precio_mayoreo: null, cantidad_mayoreo: null, limpiar_mayoreo: 'true',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(actualizado);
    expect(LoteDAO.actualizar).toHaveBeenCalledWith(7, { limpiar_mayoreo: true }, client);
  });

  it('publica como 400 el error de negocio de stock sin escribir el lote', async () => {
    const respuesta = await request(app).patch('/api/lotes/7').send({ stock_actual: 21 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({ mensaje: 'El stock actual no puede superar la cantidad ingresada del lote' });
    expect(LoteDAO.actualizar).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/productos/99', ProductoDAO.obtenerPorId, 'Producto no encontrado'],
    ['/api/lotes/99', LoteDAO.obtenerPorId, 'Lote no encontrado'],
  ])('conserva el 404 del servicio real en %s', async (ruta, consulta, mensaje) => {
    consulta.mockResolvedValue(null);

    const respuesta = await request(app).get(ruta);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje });
  });

  it('conserva el 409 del dominio cuando el código del producto está duplicado', async () => {
    ProductoDAO.obtenerPorCodigo.mockResolvedValue(producto);

    const respuesta = await request(app).post('/api/productos').send(datosProducto);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({ mensaje: 'Ya existe un producto con el código "MED003-TA"' });
    expect(ProductoDAO.crear).not.toHaveBeenCalled();
  });

  it('traduce el conflicto de unicidad de PostgreSQL al 409 esperado', async () => {
    LoteDAO.actualizar.mockRejectedValue(Object.assign(new Error('Detalle SQL interno'), { code: '23505' }));

    const respuesta = await request(app).patch('/api/lotes/7').send({ numero_lote: 'OTRO' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({ mensaje: 'Ya existe un lote con ese número para este producto en esta sucursal' });
  });

  it('devuelve 500 seguro cuando falla el DAO y permite atender la siguiente solicitud', async () => {
    const error = new Error('Detalle SQL interno');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      ProductoDAO.obtenerPorId.mockRejectedValueOnce(error);

      const respuesta = await request(app).get('/api/productos/2');

      expect(respuesta.status).toBe(500);
      expect(respuesta.body).toEqual({ mensaje: 'Error interno del servidor.' });
      expect(consoleError).toHaveBeenCalledWith(error);

      const siguiente = await request(app).get('/api/productos/2');
      expect(siguiente.status).toBe(200);
      expect(siguiente.body).toEqual(producto);
    } finally {
      consoleError.mockRestore();
    }
  });
});
