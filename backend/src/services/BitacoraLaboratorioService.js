const { isDeepStrictEqual } = require('util');
const BitacoraLaboratorioDAO = require('../daos/BitacoraLaboratorioDAO');
const AppError = require('../errors/AppError');

// Recibe filas persistidas para registrar los valores efectivos, no el body HTTP.
const registrarCambio = async ({
  id_usuario, entidad, id_entidad, accion, anterior = null, nuevo = null,
}, client) => {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    throw new AppError('Se requiere el usuario responsable del cambio', 401);
  }
  if (!client || typeof client.query !== 'function') {
    throw new Error('La bitacora requiere una transaccion');
  }
  const antes = anterior == null ? null : JSON.parse(JSON.stringify(anterior));
  const despues = nuevo == null ? null : JSON.parse(JSON.stringify(nuevo));
  let valores_anteriores = antes;
  let valores_nuevos = despues;
  if (antes && despues) {
    valores_anteriores = {};
    valores_nuevos = {};
    for (const campo of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
      if (!isDeepStrictEqual(antes[campo], despues[campo])) {
        valores_anteriores[campo] = antes[campo] ?? null;
        valores_nuevos[campo] = despues[campo] ?? null;
      }
    }
    if (!Object.keys(valores_nuevos).length) return null;
  }
  // fecha_hora la asigna PostgreSQL mediante CURRENT_TIMESTAMP.
  return BitacoraLaboratorioDAO.crear({
    id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos,
  }, client);
};

const obtenerPorExpediente = async (id_expediente) => {
  const expediente = await BitacoraLaboratorioDAO.obtenerExpedientePorId(id_expediente);
  if (!expediente) {
    throw new AppError('Expediente no encontrado', 404);
  }

  return BitacoraLaboratorioDAO.obtenerPorExpediente(id_expediente);
};

module.exports = { registrarCambio, obtenerPorExpediente };
