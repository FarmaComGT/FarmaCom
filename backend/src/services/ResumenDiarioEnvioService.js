const DAO = require('../daos/ResumenDiarioEnvioDAO');
const Gestion = require('./ResumenDiarioGestionService');
const Pdf = require('./ResumenDiarioPdfService');
const Correo = require('./CorreoService');
const { obtenerConfiguracionCorreo } = require('../config/correo');
const AppError = require('../errors/AppError');

const solicitar = async (idUsuario, idReporte) => {
  await Gestion.obtenerReporte(idUsuario, idReporte);
  const config = await Gestion.obtenerConfiguracion(idUsuario);
  if (!config.correo_destinatario) throw new AppError('Configura el correo destinatario antes de enviar', 400);
  obtenerConfiguracionCorreo();
  const envio = await DAO.solicitar(idUsuario, idReporte, config.correo_destinatario);
  if (!envio) throw new AppError('Reporte no encontrado', 404);
  return envio;
};
const listar = async (idUsuario, idReporte) => {
  await Gestion.obtenerReporte(idUsuario, idReporte);
  return DAO.listar(idUsuario, idReporte);
};
const construirMensaje = (envio, pdf) => {
  const d = envio.datos;
  const r = d.resumen;
  const moneda = (v) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v));
  const corte = new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(d.corte));
  const estado = d.estado === 'provisional' ? 'Resumen provisional de ventas' : 'Resumen de ventas';
  return {
    destinatario: envio.destinatario,
    asunto: `FarmaCom · ${estado} · ${d.fecha}`,
    texto: [estado, `Fecha: ${d.fecha}`, `Corte: ${corte}, hora de Guatemala`,
      `Total vendido: ${moneda(r.ingresos)}`, `Ventas completadas: ${r.ventas}`,
      `Utilidad bruta: ${moneda(r.utilidad_bruta)}`, `Cajas pendientes de cierre: ${r.sesiones_abiertas}`,
      d.estado === 'provisional' ? 'Incluye ventas de cajas abiertas. Los resultados pueden cambiar.' : 'Sin cajas abiertas al corte.',
      'La utilidad bruta no descuenta salarios, alquiler ni otros gastos operativos.',
      ...(d.programacion ? [`Envío previsto: ${new Intl.DateTimeFormat('es-GT', {
        timeZone: 'America/Guatemala', dateStyle: 'medium', timeStyle: 'short',
      }).format(new Date(d.programacion.previsto_para))}, hora de Guatemala.`,
      'Si el sistema estuvo fuera de servicio, el corte corresponde al momento de generar este reporte.'] : []),
      'Se adjunta el reporte completo en PDF.'].join('\n'),
    adjuntos: [{ filename: `resumen-ventas-${d.fecha}.pdf`, content: pdf, contentType: 'application/pdf' }],
    messageId: `<resumen-diario-${envio.id_envio}@farmacom.local>`,
  };
};
const procesarUno = async () => {
  obtenerConfiguracionCorreo();
  const envio = await DAO.reclamar();
  if (!envio) return false;
  let enviado = false;
  let resultado;
  try {
    const pdf = await Pdf.generar(envio.datos);
    enviado = true;
    resultado = await Correo.enviar(construirMensaje(envio, pdf));
  } catch (error) {
    // No se persisten respuestas SMTP que puedan contener credenciales o información interna.
    const rechazoExplicito = ['EAUTH', 'EENVELOPE', 'ECONNECTION', 'EDNS'].includes(error.code)
      || (Number(error.responseCode) >= 400 && Number(error.responseCode) < 600);
    const incierto = enviado && !rechazoExplicito;
    const temporal = enviado && (['ECONNECTION', 'EDNS'].includes(error.code)
      || (Number(error.responseCode) >= 400 && Number(error.responseCode) < 500));
    const mensaje = incierto ? 'No se pudo confirmar la aceptación; verifica el buzón antes de reenviar.'
      : 'No se pudo generar o enviar el reporte. Revisa la configuración del correo.';
    if (temporal && !incierto) await DAO.finalizar(envio.id_envio, 'fallido', null, mensaje, true);
    else await DAO.finalizar(envio.id_envio, incierto ? 'incierto' : 'fallido', null, mensaje);
    return true;
  }
  // Una falla al guardar esta confirmación no dispara un segundo envío.
  await DAO.finalizar(envio.id_envio, 'aceptado', resultado.messageId, null);
  return true;
};
const procesarPendientes = async () => {
  obtenerConfiguracionCorreo();
  await DAO.marcarInterrumpidos();
  for (let i = 0; i < 10; i += 1) if (!await procesarUno()) break;
};
module.exports = { solicitar, listar, procesarUno, procesarPendientes, construirMensaje };
