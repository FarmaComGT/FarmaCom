jest.mock('../daos/ProductoDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const { buscarPorLectura, actualizarProducto, seleccionarPorLectura } = require('./ProductoService');
const { normalizarCodigoBarras } = require('../utils/codigoBarras');

describe('lectura para seleccionar el producto de una promoción', () => {
  beforeEach(() => jest.resetAllMocks());
  it('identifica el catálogo sin exigir existencias y conserva ceros', async () => {
    ProductoDAO.obtenerPorCodigoLectura.mockResolvedValue([{ id_producto: 7, activo: true }]);
    ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 7, activo: true, codigo_barras: '000123', nombre_comercial: 'Oxímetro', precio_compra: 20 });
    const producto = await seleccionarPorLectura(' 000123 ');
    expect(ProductoDAO.obtenerPorCodigoLectura).toHaveBeenCalledWith('000123');
    expect(producto.codigo_barras).toBe('000123');
    expect(producto).not.toHaveProperty('precio_compra');
    expect(ProductoDAO.obtenerLotesParaLectura).not.toHaveBeenCalled();
  });
  it.each([
    [[], 404],
    [[{ id_producto: 7, activo: false }], 409],
    [[{ id_producto: 7, activo: true }, { id_producto: 8, activo: true }], 409],
  ])('rechaza códigos inexistentes, inactivos o ambiguos', async (coincidencias, status) => {
    ProductoDAO.obtenerPorCodigoLectura.mockResolvedValue(coincidencias);
    await expect(seleccionarPorLectura('000123')).rejects.toMatchObject({ status });
  });
});

describe('Lectura exacta de productos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ProductoDAO.obtenerPorCodigoLectura.mockResolvedValue([{ id_producto: 7, activo: true }]);
    ProductoDAO.obtenerLotesParaLectura.mockResolvedValue([{ id_producto: 7, id_lote: 9 }]);
  });

  it('conserva ceros iniciales y consulta lotes únicamente de la sucursal autenticada', async () => {
    await expect(buscarPorLectura({ codigo: ' 0012345678905 ', id_sucursal: 3 }))
      .resolves.toEqual([{ id_producto: 7, id_lote: 9 }]);
    expect(ProductoDAO.obtenerPorCodigoLectura).toHaveBeenCalledWith('0012345678905');
    expect(ProductoDAO.obtenerLotesParaLectura).toHaveBeenCalledWith(7, 3);
    expect(ProductoDAO.autocompletarParaPOS).not.toHaveBeenCalled();
  });

  it('no utiliza resultados parecidos cuando el código no está registrado', async () => {
    ProductoDAO.obtenerPorCodigoLectura.mockResolvedValue([]);
    await expect(buscarPorLectura({ codigo: 'TEST-0001', id_sucursal: 3 })).rejects.toMatchObject({ status: 404 });
    expect(ProductoDAO.obtenerLotesParaLectura).not.toHaveBeenCalled();
  });

  it.each([
    [[{ id_producto: 1, activo: false }], 'inactivo'],
    [[{ id_producto: 1, activo: true }, { id_producto: 2, activo: true }], 'más de un producto'],
  ])('rechaza catálogos inactivos o ambiguos: %s', async (coincidencias, mensaje) => {
    ProductoDAO.obtenerPorCodigoLectura.mockResolvedValue(coincidencias);
    await expect(buscarPorLectura({ codigo: 'TEST-0001', id_sucursal: 3 })).rejects.toThrow(mensaje);
    expect(ProductoDAO.obtenerLotesParaLectura).not.toHaveBeenCalled();
  });

  it('explica la falta de lotes vendibles sin elegir otro producto', async () => {
    ProductoDAO.obtenerLotesParaLectura.mockResolvedValue([]);
    await expect(buscarPorLectura({ codigo: 'TEST-0001', id_sucursal: 3 }))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining('lotes vendibles') });
  });

  it.each([undefined, '', 'ABC DEF', 'ABC\u001d123', 123, ['123'], 'A'.repeat(65)])('rechaza lecturas inválidas: %s', async (codigo) => {
    await expect(buscarPorLectura({ codigo, id_sucursal: 3 })).rejects.toMatchObject({ status: 400 });
    expect(ProductoDAO.obtenerPorCodigoLectura).not.toHaveBeenCalled();
  });

  it('rechaza una sesión sin sucursal', async () => {
    await expect(buscarPorLectura({ codigo: '123', id_sucursal: null })).rejects.toMatchObject({ status: 403 });
  });

  it('normaliza campos opcionales vacíos sin convertir identificadores a números', () => {
    expect(normalizarCodigoBarras('   ', { opcional: true })).toBeNull();
    expect(normalizarCodigoBarras('000123')).toBe('000123');
  });

  it('rechaza códigos no textuales al crear o actualizar', async () => {
    // La actualización alcanza la normalización tras cargar el producto.
    ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 7, codigo: 'MED-7' });
    await expect(actualizarProducto(7, { codigo_barras: 123 })).rejects.toMatchObject({ status: 400 });
    expect(ProductoDAO.actualizar).not.toHaveBeenCalled();
  });

  it('traduce una colisión concurrente del índice único a un error de conflicto', async () => {
    ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 7, codigo: 'MED-7' });
    ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
    ProductoDAO.actualizar.mockRejectedValue({ code: '23505', constraint: 'uq_producto_codigo_barras' });
    await expect(actualizarProducto(7, { codigo_barras: '000123' }))
      .rejects.toMatchObject({ status: 409, message: 'El código de barras ya está asignado a otro producto.' });
  });
});
