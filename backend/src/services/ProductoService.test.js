jest.mock('../daos/ProductoDAO');
jest.mock('../daos/PresentacionDAO');
jest.mock('../daos/CasaFarmaceuticaDAO');
jest.mock('../daos/ProveedorDAO');

const ProductoDAO = require('../daos/ProductoDAO');
const PresentacionDAO = require('../daos/PresentacionDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const ProductoService = require('./ProductoService');

const datosBase = {
  codigo: 'MED001',
  nombre_generico: 'Paracetamol',
  concentracion: '500 mg',
  id_presentacion: 1,
  id_casa: 1,
  meses_alerta_vencimiento: 6,
};

describe('ProductoService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1, activo: true });
    ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, activo: true });
  });

  describe('crearProducto', () => {
    it('crea el producto cuando todo es válido', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
      ProductoDAO.obtenerPorCodigo.mockResolvedValue(null);
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
      ProductoDAO.crear.mockResolvedValue({ id_producto: 1 });
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, ...datosBase });

      const resultado = await ProductoService.crearProducto(datosBase);

      expect(ProductoDAO.crear).toHaveBeenCalled();
      expect(resultado).toEqual({ id_producto: 1, ...datosBase });
    });

    it('crea un producto sin concentración y la normaliza a null', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
      ProductoDAO.obtenerPorCodigo.mockResolvedValue(null);
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
      ProductoDAO.crear.mockResolvedValue({ id_producto: 1 });
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });

      await ProductoService.crearProducto({ ...datosBase, concentracion: '   ' });

      expect(ProductoDAO.crear).toHaveBeenCalledWith(
        expect.objectContaining({ concentracion: null }),
      );
    });

    it('rechaza con 400 si el código viene vacío', async () => {
      await expect(
        ProductoService.crearProducto({ ...datosBase, codigo: '  ' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si el nombre genérico viene vacío', async () => {
      await expect(
        ProductoService.crearProducto({ ...datosBase, nombre_generico: '' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si los meses de alerta no son positivos', async () => {
      await expect(
        ProductoService.crearProducto({ ...datosBase, meses_alerta_vencimiento: 0 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si la presentación no existe', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProductoService.crearProducto(datosBase)).rejects.toMatchObject({ status: 400 });
      expect(ProductoDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el código ya existe', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
      ProductoDAO.obtenerPorCodigo.mockResolvedValue({ id_producto: 5 });

      await expect(ProductoService.crearProducto(datosBase)).rejects.toMatchObject({ status: 409 });
      expect(ProductoDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si ya existe el mismo medicamento en esa presentación', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
      ProductoDAO.obtenerPorCodigo.mockResolvedValue(null);
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue({ nombre_comercial: 'Tylenol' });

      await expect(ProductoService.crearProducto(datosBase)).rejects.toMatchObject({ status: 409 });
      expect(ProductoDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza una casa farmacéutica inactiva', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1, activo: false });

      await expect(ProductoService.crearProducto(datosBase)).rejects.toMatchObject({
        status: 409,
        message: 'No se puede asignar una casa farmacéutica inactiva',
      });
      expect(ProductoDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza un proveedor inactivo', async () => {
      PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 2, activo: false });

      await expect(
        ProductoService.crearProducto({ ...datosBase, id_proveedor: 2 }),
      ).rejects.toMatchObject({
        status: 409,
        message: 'No se puede asignar un proveedor inactivo',
      });
      expect(ProductoDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerTodos', () => {
    it('delega al DAO', async () => {
      ProductoDAO.obtenerTodos.mockResolvedValue([{ id_producto: 1 }]);

      await expect(ProductoService.obtenerTodos()).resolves.toEqual([{ id_producto: 1 }]);
    });
  });

  describe('autocompletarParaPOS', () => {
    it('devuelve resultados con una búsqueda válida', async () => {
      ProductoDAO.autocompletarParaPOS.mockResolvedValue([{ id_producto: 1 }]);

      const resultado = await ProductoService.autocompletarParaPOS({
        busqueda: 'para', id_sucursal: 1,
      });

      expect(ProductoDAO.autocompletarParaPOS).toHaveBeenCalledWith('para', 1, 10);
      expect(resultado).toEqual([{ id_producto: 1 }]);
    });

    it('rechaza con 400 si la búsqueda viene vacía', async () => {
      await expect(
        ProductoService.autocompletarParaPOS({ busqueda: '   ', id_sucursal: 1 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si la búsqueda no tiene letras ni números', async () => {
      await expect(
        ProductoService.autocompletarParaPOS({ busqueda: '!!!', id_sucursal: 1 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 403 si no hay una sucursal válida', async () => {
      await expect(
        ProductoService.autocompletarParaPOS({ busqueda: 'para', id_sucursal: 0 }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rechaza con 400 si el límite está fuera de rango', async () => {
      await expect(
        ProductoService.autocompletarParaPOS({ busqueda: 'para', id_sucursal: 1, limite: 50 }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 cuando no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProductoService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarProducto', () => {
    const existente = { id_producto: 1, ...datosBase, codigo: 'MED001' };

    it('rechaza con 404 si el producto no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProductoService.actualizarProducto(99, { codigo: 'X' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo código ya existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(existente);
      ProductoDAO.obtenerPorCodigo.mockResolvedValue({ id_producto: 2 });

      await expect(
        ProductoService.actualizarProducto(1, { codigo: 'MED002' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(ProductoDAO.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza con 400 si la nueva presentación no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(existente);
      PresentacionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProductoService.actualizarProducto(1, { id_presentacion: 99 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 409 si otro producto ya tiene esa misma identidad', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(existente);
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue({ id_producto: 2 });

      await expect(
        ProductoService.actualizarProducto(1, { nombre_generico: 'Ibuprofeno' }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('actualiza el producto cuando todo es válido', async () => {
      ProductoDAO.obtenerPorId
        .mockResolvedValueOnce(existente)
        .mockResolvedValueOnce({ ...existente, nombre_generico: 'Ibuprofeno' });
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
      ProductoDAO.actualizar.mockResolvedValue({ id_producto: 1 });

      const resultado = await ProductoService.actualizarProducto(1, { nombre_generico: 'Ibuprofeno' });

      expect(resultado.nombre_generico).toBe('Ibuprofeno');
    });

    it('convierte una concentración vacía a null al actualizar', async () => {
      ProductoDAO.obtenerPorId
        .mockResolvedValueOnce(existente)
        .mockResolvedValueOnce({ ...existente, concentracion: null });
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
      ProductoDAO.actualizar.mockResolvedValue({ id_producto: 1 });

      await ProductoService.actualizarProducto(1, { concentracion: '   ' });

      expect(ProductoDAO.actualizar).toHaveBeenCalledWith(
        1, expect.objectContaining({ concentracion: null }),
      );
    });

    it('conserva la concentración existente cuando el campo no se envía', async () => {
      ProductoDAO.obtenerPorId
        .mockResolvedValueOnce(existente)
        .mockResolvedValueOnce(existente);
      ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
      ProductoDAO.actualizar.mockResolvedValue({ id_producto: 1 });

      await ProductoService.actualizarProducto(1, { nombre_generico: 'Ibuprofeno' });

      const identidadConsultada = ProductoDAO.obtenerPorIdentidad.mock.calls[0][0];
      expect(identidadConsultada.concentracion).toBe(existente.concentracion);
    });
  });

  describe('cambiarAplicaMayoreo', () => {
    it('rechaza con 404 si el producto no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProductoService.cambiarAplicaMayoreo(99, true),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('activa el mayoreo correctamente', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      ProductoDAO.cambiarAplicaMayoreo.mockResolvedValue({ id_producto: 1 });

      const resultado = await ProductoService.cambiarAplicaMayoreo(1, true);

      expect(resultado.mensaje).toBe('Mayoreo activado correctamente');
    });
  });

  describe('desactivarProducto', () => {
    it('rechaza con 404 si no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProductoService.desactivarProducto(99)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si ya está desactivado', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, activo: false });

      await expect(ProductoService.desactivarProducto(1)).rejects.toMatchObject({ status: 409 });
    });

    it('desactiva correctamente', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, activo: true });
      ProductoDAO.cambiarActivo.mockResolvedValue({ id_producto: 1 });

      const resultado = await ProductoService.desactivarProducto(1);

      expect(resultado.mensaje).toBe('Producto desactivado correctamente');
    });
  });

  describe('reactivarProducto', () => {
    it('rechaza con 404 si no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProductoService.reactivarProducto(99)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si ya está activo', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, activo: true });

      await expect(ProductoService.reactivarProducto(1)).rejects.toMatchObject({ status: 409 });
    });

    it('reactiva correctamente', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, activo: false });
      ProductoDAO.cambiarActivo.mockResolvedValue({ id_producto: 1 });

      const resultado = await ProductoService.reactivarProducto(1);

      expect(resultado.mensaje).toBe('Producto reactivado correctamente');
    });
  });
});
