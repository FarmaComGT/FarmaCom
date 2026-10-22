const LaboratorioDAO = require('../daos/LaboratorioDAO');
const AppError = require('../errors/AppError');

const listarActivos = async () => LaboratorioDAO.listarActivos();

const crear = async (datos) => {
  const existente = await LaboratorioDAO.obtenerPorNombre(datos.nombre_laboratorio);
  if (existente) throw new AppError('Ya existe un laboratorio con ese nombre', 409);
  return LaboratorioDAO.crear(datos);
};

const actualizar = async (id_laboratorio, datos) => {
  const existente = await LaboratorioDAO.obtenerPorId(id_laboratorio);
  if (!existente || !existente.activo) throw new AppError('Laboratorio no encontrado', 404);

  if (datos.nombre_laboratorio.toLowerCase() !== existente.nombre_laboratorio.toLowerCase()) {
    const duplicado = await LaboratorioDAO.obtenerPorNombre(datos.nombre_laboratorio);
    if (duplicado && duplicado.id_laboratorio !== id_laboratorio) {
      throw new AppError('Ya existe un laboratorio con ese nombre', 409);
    }
  }

  const laboratorio = await LaboratorioDAO.actualizar(id_laboratorio, datos);
  if (!laboratorio) throw new AppError('Laboratorio no encontrado', 404);
  return laboratorio;
};

module.exports = { listarActivos, crear, actualizar };
