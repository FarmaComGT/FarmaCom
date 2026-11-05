const DAO = require('../daos/ResumenDiarioGestionDAO');
const Resumen = require('./ResumenDiarioService');
const Pdf = require('./ResumenDiarioPdfService');
const AppError = require('../errors/AppError');

const predeterminada = () => ({
  correo_destinatario: '', hora_envio: '20:00', automatico: false,
  todas_sucursales: true, sucursales: [],
});
const obtenerConfiguracion = async (idUsuario) => ({
  ...(await DAO.obtenerConfiguracion(idUsuario) || predeterminada()),
  zona_horaria: 'America/Guatemala',
});

const guardarConfiguracion = async (idUsuario, datos) => {
  if (datos.automatico && !datos.correo_destinatario) {
    throw new AppError('Ingresa el correo destinatario para activar el envío automático', 400);
  }
  const sucursales = datos.todas_sucursales ? [] : [...new Set(datos.sucursales)].sort((a, b) => a - b);
  if (!datos.todas_sucursales && !sucursales.length) {
    throw new AppError('Selecciona al menos una sucursal', 400);
  }
  const config = {
    correo_destinatario: datos.correo_destinatario, hora_envio: datos.hora_envio,
    automatico: datos.automatico, todas_sucursales: datos.todas_sucursales, sucursales,
  };
  return { ...await DAO.guardarConfiguracion(idUsuario, config), zona_horaria: 'America/Guatemala' };
};

const crearReporte = async (idUsuario, fecha) => {
  const config = await obtenerConfiguracion(idUsuario);
  const datos = await Resumen.obtener({ fecha, sucursales: config.todas_sucursales ? undefined : config.sucursales });
  return DAO.guardarReporte(idUsuario, datos);
};
const obtenerReporte = async (idUsuario, idReporte, incluirPdf = false) => {
  const reporte = await DAO.obtenerReporte(idUsuario, idReporte);
  if (!reporte) throw new AppError('Reporte no encontrado', 404);
  if (incluirPdf) {
    // Regenera con los datos guardados, nunca con las ventas actuales.
    // Los bytes existen únicamente en memoria durante la descarga o el envío.
    const { datos, ...metadatos } = reporte;
    return { ...metadatos, pdf: await Pdf.generar(datos) };
  }
  return reporte;
};

module.exports = { obtenerConfiguracion, guardarConfiguracion, crearReporte, obtenerReporte,
  listarReportes: DAO.listarReportes };
