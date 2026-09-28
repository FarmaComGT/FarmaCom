const { isDeepStrictEqual } = require('util');
const BitacoraLaboratorioDAO = require('../daos/BitacoraLaboratorioDAO');

// Recibe filas persistidas para registrar los valores efectivos, no el body HTTP.
const registrarCambio = async ({
  id_usuario, entidad, id_entidad, accion, anterior = null, nuevo = null,
}, client) => {
  if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
    const error = new Error('Se requiere el usuario responsable del cambio');
    error.status = 401;
    throw error;
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

module.exports = { registrarCambio };
