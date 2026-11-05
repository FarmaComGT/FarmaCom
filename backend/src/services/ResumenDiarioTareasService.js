const { procesarProgramacion } = require('./ResumenDiarioProgramacionService');
const { procesarPendientes } = require('./ResumenDiarioEnvioService');

let ejecutando = false;
const ejecutar = async () => {
  if (ejecutando) return;
  ejecutando = true;
  try {
    try { await procesarProgramacion(); } catch {
      console.error('No se pudieron programar los resúmenes diarios. Revisa SMTP y la base de datos.');
    }
    // Un fallo al generar reportes nuevos no detiene los correos ya pendientes.
    try { await procesarPendientes(); } catch {
      console.error('No se pudieron procesar los reportes por correo. Revisa SMTP y la base de datos.');
    }
  } finally { ejecutando = false; }
};
module.exports = { ejecutar };
