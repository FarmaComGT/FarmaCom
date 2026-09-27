jest.mock('../daos/ProductoDAO');
jest.mock('../daos/PresentacionDAO');

const ProductoDAO = require('../daos/ProductoDAO');
const PresentacionDAO = require('../daos/PresentacionDAO');
const ProductoService = require('./ProductoService');

const productoBase = {
  codigo: 'MED010-TE',
  nombre_comercial: 'Termómetro digital',
  nombre_generico: 'Termómetro',
  id_presentacion: 4,
  id_categoria: 2,
  id_casa: 3,
  precio_compra: 25,
  meses_alerta_vencimiento: 12,
};

describe('ProductoService - concentración opcional', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crea un producto sin concentración y la normaliza a null', async () => {
    PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 4, nombre: 'Unidad' });
    ProductoDAO.obtenerPorCodigo.mockResolvedValue(null);
    ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
    ProductoDAO.crear.mockResolvedValue({ id_producto: 10 });
    ProductoDAO.obtenerPorId.mockResolvedValue({
      id_producto: 10,
      ...productoBase,
      concentracion: null,
    });

    const resultado = await ProductoService.crearProducto(productoBase);

    expect(ProductoDAO.obtenerPorIdentidad).toHaveBeenCalledWith({
      ...productoBase,
      concentracion: null,
    });
    expect(ProductoDAO.crear).toHaveBeenCalledWith({
      ...productoBase,
      concentracion: null,
    });
    expect(resultado.concentracion).toBeNull();
  });

  it('convierte una concentración vacía a null al actualizar', async () => {
    const existente = {
      id_producto: 10,
      ...productoBase,
      concentracion: '500 mg',
    };
    ProductoDAO.obtenerPorId
      .mockResolvedValueOnce(existente)
      .mockResolvedValueOnce({ ...existente, concentracion: null });
    ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
    ProductoDAO.actualizar.mockResolvedValue({ ...existente, concentracion: null });

    const resultado = await ProductoService.actualizarProducto(10, { concentracion: '   ' });

    expect(ProductoDAO.obtenerPorIdentidad).toHaveBeenCalledWith(expect.objectContaining({
      concentracion: null,
    }));
    expect(ProductoDAO.actualizar).toHaveBeenCalledWith(10, { concentracion: null });
    expect(resultado.concentracion).toBeNull();
  });

  it('conserva la concentración existente cuando el campo no se envía', async () => {
    const existente = {
      id_producto: 10,
      ...productoBase,
      concentracion: '500 mg',
    };
    ProductoDAO.obtenerPorId
      .mockResolvedValueOnce(existente)
      .mockResolvedValueOnce({ ...existente, nombre_comercial: 'Termómetro clínico' });
    ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
    ProductoDAO.actualizar.mockResolvedValue(existente);

    await ProductoService.actualizarProducto(10, { nombre_comercial: 'Termómetro clínico' });

    expect(ProductoDAO.obtenerPorIdentidad).toHaveBeenCalledWith(expect.objectContaining({
      concentracion: '500 mg',
    }));
    expect(ProductoDAO.actualizar).toHaveBeenCalledWith(10, {
      nombre_comercial: 'Termómetro clínico',
    });
  });
});

describe('ProductoService - autocompletado para POS', () => {
  beforeEach(() => jest.clearAllMocks());

  it('normaliza la búsqueda y usa diez resultados por defecto', async () => {
    ProductoDAO.autocompletarParaPOS.mockResolvedValue([{ id_producto: 2 }]);

    const resultado = await ProductoService.autocompletarParaPOS({
      busqueda: '  acetaminofen  ',
      id_sucursal: 4,
    });

    expect(ProductoDAO.autocompletarParaPOS).toHaveBeenCalledWith('acetaminofen', 4, 10);
    expect(resultado).toEqual([{ id_producto: 2 }]);
  });

  it('rechaza usuarios sin una sucursal válida', async () => {
    await expect(ProductoService.autocompletarParaPOS({
      busqueda: 'acetaminofen',
      id_sucursal: null,
    })).rejects.toMatchObject({ status: 403 });

    expect(ProductoDAO.autocompletarParaPOS).not.toHaveBeenCalled();
  });

  it('rechaza un límite fuera del rango permitido', async () => {
    await expect(ProductoService.autocompletarParaPOS({
      busqueda: 'acetaminofen',
      id_sucursal: 4,
      limite: 25,
    })).rejects.toMatchObject({ status: 400 });

    expect(ProductoDAO.autocompletarParaPOS).not.toHaveBeenCalled();
  });

  it('rechaza búsquedas compuestas únicamente por caracteres especiales', async () => {
    await expect(ProductoService.autocompletarParaPOS({
      busqueda: '%-_',
      id_sucursal: 4,
    })).rejects.toMatchObject({ status: 400 });

    expect(ProductoDAO.autocompletarParaPOS).not.toHaveBeenCalled();
  });
});
