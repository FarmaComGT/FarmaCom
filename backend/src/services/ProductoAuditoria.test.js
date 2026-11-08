jest.mock('../daos/ProductoDAO');
jest.mock('../daos/PresentacionDAO');
jest.mock('../daos/CasaFarmaceuticaDAO');
jest.mock('../daos/ProveedorDAO');
jest.mock('../daos/BitacoraInventarioDAO');

const ProductoDAO = require('../daos/ProductoDAO');
const PresentacionDAO = require('../daos/PresentacionDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const BitacoraInventarioDAO = require('../daos/BitacoraInventarioDAO');
const ProductoService = require('./ProductoService');

const client = {};
const usuario = { id_usuario: 9, rol: 'administrador' };
const datos = {
  codigo: 'P-1', nombre_comercial: 'Producto', nombre_generico: 'Genérico',
  id_presentacion: 1, id_categoria: 1, id_casa: 1, meses_alerta_vencimiento: 6,
};

describe('auditoría de productos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ProductoDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion(client));
    ProductoDAO.obtenerPorCodigo.mockResolvedValue(null);
    ProductoDAO.obtenerPorIdentidad.mockResolvedValue(null);
    PresentacionDAO.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });
    CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1, activo: true });
  });

  it('registra el alta dentro de la misma transacción', async () => {
    const creado = { id_producto: 4, ...datos, activo: true };
    ProductoDAO.crear.mockResolvedValue({ id_producto: 4 });
    ProductoDAO.obtenerPorId.mockResolvedValue(creado);

    await expect(ProductoService.crearProducto(datos, usuario)).resolves.toEqual(creado);

    expect(BitacoraInventarioDAO.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'producto', accion: 'alta', id_producto: 4, id_usuario: 9, nuevo: creado,
      }),
      client,
    );
  });

  it('registra el estado anterior y nuevo al desactivar', async () => {
    const anterior = { id_producto: 4, ...datos, activo: true };
    const nuevo = { ...anterior, activo: false };
    ProductoDAO.obtenerPorId.mockResolvedValueOnce(anterior).mockResolvedValueOnce(nuevo);
    ProductoDAO.obtenerFilaPorId.mockResolvedValue(anterior);
    ProductoDAO.cambiarActivo.mockResolvedValue(nuevo);

    await ProductoService.desactivarProducto(4, usuario);

    expect(BitacoraInventarioDAO.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'cambio_estado', anterior, nuevo }),
      client,
    );
  });
});
