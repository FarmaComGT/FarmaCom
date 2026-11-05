const DAO = require('../daos/ResumenDiarioProgramacionDAO');
const Resumen = require('./ResumenDiarioService');
const { obtenerConfiguracionCorreo } = require('../config/correo');

const procesarProgramacion = async () => {
  obtenerConfiguracionCorreo();
  let generados = 0;
  // Recupera también días omitidos durante una caída, en lotes pequeños.
  for (let i = 0; i < 10; i += 1) {
    const reporte = await DAO.generarSiguiente(async (config, client) => {
      const datos = await Resumen.obtener({ fecha: config.fecha,
        sucursales: config.todas_sucursales ? undefined : config.sucursales }, client);
      return { ...datos, programacion: { previsto_para: config.previsto_para } };
    });
    if (!reporte) break;
    generados += 1;
  }
  return generados;
};

module.exports = { procesarProgramacion };
