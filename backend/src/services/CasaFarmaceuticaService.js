const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const AppError = require('../errors/AppError');

const crearCasa = async ({ nombre }) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorNombre(nombre);
  if (existente) {
    throw new AppError('Ya existe una casa farmacéutica con ese nombre', 409);
  }

  return await CasaFarmaceuticaDAO.crear({ nombre });
};

const obtenerTodas = async () => {
  return await CasaFarmaceuticaDAO.obtenerTodos();
};

const obtenerPorId = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }
  return casa;
};

const actualizarCasa = async (id_casa, campos) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!existente) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }

  if (campos.nombre && campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const duplicado = await CasaFarmaceuticaDAO.obtenerPorNombre(campos.nombre);
    if (duplicado) {
      throw new AppError('Ya existe una casa farmacéutica con ese nombre', 409);
    }
  }

  return await CasaFarmaceuticaDAO.actualizar(id_casa, campos);
};

const cambiarEstado = async (id_casa, activo) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!existente) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }

  return await CasaFarmaceuticaDAO.cambiarActivo(id_casa, activo);
};

const tieneUsoRegistrado = ({ productos = 0, lotes = 0 }) => (
  Number(productos) > 0 || Number(lotes) > 0
);

const desactivarPorUso = async (id_casa, existente, uso, client) => {
  const casa = await CasaFarmaceuticaDAO.cambiarActivo(id_casa, false, client);
  const estado = existente.activo ? 'se desactivó' : 'se mantuvo inactiva';

  return {
    accion: 'desactivado',
    mensaje: `La casa farmacéutica no se eliminó porque tiene productos o historial de inventario asociado; ${estado} para conservar esos datos.`,
    casa,
    uso,
  };
};

const eliminarCasa = async (id_casa) => {
  try {
    return await CasaFarmaceuticaDAO.ejecutarEnTransaccion(async (client) => {
      const existente = await CasaFarmaceuticaDAO.obtenerParaActualizar(id_casa, client);
      if (!existente) {
        throw new AppError('Casa farmacéutica no encontrada', 404);
      }

      const uso = await CasaFarmaceuticaDAO.obtenerUso(id_casa, client);
      if (tieneUsoRegistrado(uso)) {
        return desactivarPorUso(id_casa, existente, uso, client);
      }

      const casa = await CasaFarmaceuticaDAO.eliminar(id_casa, client);
      if (!casa) {
        throw new AppError('Casa farmacéutica no encontrada', 404);
      }

      return {
        accion: 'eliminado',
        mensaje: 'Casa farmacéutica eliminada correctamente',
        casa,
        uso,
      };
    });
  } catch (error) {
    // Respaldo ante una relación creada concurrentemente o una FK futura
    // que todavía no forme parte del resumen de uso.
    if (error.code !== '23503') throw error;

    const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
    if (!existente) {
      throw new AppError('Casa farmacéutica no encontrada', 404);
    }
    const uso = await CasaFarmaceuticaDAO.obtenerUso(id_casa);
    return desactivarPorUso(id_casa, existente, uso);
  }
};

const obtenerProveedoresVinculados = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }

  return await CasaFarmaceuticaDAO.obtenerProveedoresVinculados(id_casa);
};

module.exports = {
  crearCasa,
  obtenerTodas,
  obtenerPorId,
  actualizarCasa,
  cambiarEstado,
  eliminarCasa,
  obtenerProveedoresVinculados,
};
