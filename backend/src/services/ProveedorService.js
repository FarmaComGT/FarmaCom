const ProveedorDAO = require('../daos/ProveedorDAO');
const AppError = require('../errors/AppError');

const crearProveedor = async ({ nombre }) => {
  const existente = await ProveedorDAO.obtenerPorNombre(nombre);
  if (existente) {
    throw new AppError('Ya existe un proveedor con ese nombre', 409);
  }

  return await ProveedorDAO.crear({ nombre });
};

const obtenerTodos = async () => {
  return await ProveedorDAO.obtenerTodos();
};

const obtenerPorId = async (id_proveedor) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) {
    throw new AppError('Proveedor no encontrado', 404);
  }
  return proveedor;
};

const actualizarProveedor = async (id_proveedor, campos) => {
  const existente = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!existente) {
    throw new AppError('Proveedor no encontrado', 404);
  }

  if (campos.nombre && campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const duplicado = await ProveedorDAO.obtenerPorNombre(campos.nombre);
    if (duplicado) {
      throw new AppError('Ya existe un proveedor con ese nombre', 409);
    }
  }

  return await ProveedorDAO.actualizar(id_proveedor, campos);
};

const cambiarEstado = async (id_proveedor, activo) => {
  const existente = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!existente) {
    throw new AppError('Proveedor no encontrado', 404);
  }

  return await ProveedorDAO.cambiarActivo(id_proveedor, activo);
};

const tieneUsoRegistrado = ({ productos = 0, lotes = 0 }) => (
  Number(productos) > 0 || Number(lotes) > 0
);

const desactivarPorUso = async (id_proveedor, existente, uso, client) => {
  const proveedor = await ProveedorDAO.cambiarActivo(id_proveedor, false, client);
  const estado = existente.activo ? 'se desactivó' : 'se mantuvo inactivo';

  return {
    accion: 'desactivado',
    mensaje: `El proveedor no se eliminó porque tiene productos, lotes o historial de inventario asociado; ${estado} para conservar esos datos.`,
    proveedor,
    uso,
  };
};

const eliminarProveedor = async (id_proveedor) => {
  try {
    return await ProveedorDAO.ejecutarEnTransaccion(async (client) => {
      const existente = await ProveedorDAO.obtenerParaActualizar(id_proveedor, client);
      if (!existente) {
        throw new AppError('Proveedor no encontrado', 404);
      }

      const uso = await ProveedorDAO.obtenerUso(id_proveedor, client);
      if (tieneUsoRegistrado(uso)) {
        return desactivarPorUso(id_proveedor, existente, uso, client);
      }

      const proveedor = await ProveedorDAO.eliminar(id_proveedor, client);
      if (!proveedor) {
        throw new AppError('Proveedor no encontrado', 404);
      }

      return {
        accion: 'eliminado',
        mensaje: 'Proveedor eliminado correctamente',
        proveedor,
        uso,
      };
    });
  } catch (error) {
    if (error.code !== '23503') throw error;

    const existente = await ProveedorDAO.obtenerPorId(id_proveedor);
    if (!existente) {
      throw new AppError('Proveedor no encontrado', 404);
    }
    const uso = await ProveedorDAO.obtenerUso(id_proveedor);
    return desactivarPorUso(id_proveedor, existente, uso);
  }
};

module.exports = {
  crearProveedor,
  obtenerTodos,
  obtenerPorId,
  actualizarProveedor,
  cambiarEstado,
  eliminarProveedor,
};
