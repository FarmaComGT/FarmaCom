const BitacoraLaboratorioService = require('./BitacoraLaboratorioService');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');
const ResultadoLaboratorioDAO = require('../daos/ResultadoLaboratorioDAO');
const UsuarioDAO = require('../daos/UsuarioDAO');
const { RUTA_UPLOADS_RESULTADOS, PUBLIC_API_BASE_URL } = require('../config/almacenamiento');

const MESES_VIGENCIA = 6;
const TAMANO_QR_PUNTOS = 100;
const MARGEN_QR_PUNTOS = 24;
const MOTIVO_VENCIMIENTO_AUTOMATICO = 'Vencimiento automático (6 meses)';
const CORREO_USUARIO_SISTEMA = 'sistema.laboratorio@farmacom.local';

const noEncontrado = (mensaje = 'Resultado no encontrado') => {
  const error = new Error(mensaje);
  error.status = 404;
  return error;
};

const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const calcularFechaExpiracion = () => {
  const fecha = new Date();
  fecha.setUTCMonth(fecha.getUTCMonth() + MESES_VIGENCIA);
  return fecha;
};

const construirUrlPublica = (token) => `${PUBLIC_API_BASE_URL}/api/resultados-laboratorio/publico/${token}`;

const generarPdfConQr = async (bufferOriginal, url) => {
  const pdfDoc = await PDFDocument.load(bufferOriginal);
  const qrImageBytes = await QRCode.toBuffer(url, { type: 'png', margin: 1, width: 200 });
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  const paginas = pdfDoc.getPages();
  const ultimaPagina = paginas[paginas.length - 1];
  const { width } = ultimaPagina.getSize();

  ultimaPagina.drawImage(qrImage, {
    x: width - TAMANO_QR_PUNTOS - MARGEN_QR_PUNTOS,
    y: MARGEN_QR_PUNTOS,
    width: TAMANO_QR_PUNTOS,
    height: TAMANO_QR_PUNTOS,
  });

  return Buffer.from(await pdfDoc.save());
};

const subirResultado = async ({ id_paciente, categoria, buffer, id_usuario }) => {
  const expediente = await ResultadoLaboratorioDAO.obtenerExpedientePorPaciente(id_paciente);
  if (!expediente) lanzarError('El paciente no tiene expediente de laboratorio', 404);

  const token = crypto.randomUUID();
  const url = construirUrlPublica(token);
  let bufferFinal;
  try {
    bufferFinal = await generarPdfConQr(buffer, url);
  } catch (error) {
    lanzarError('No se pudo procesar el PDF proporcionado', 400);
  }

  const nombreArchivo = `${token}.pdf`;
  // El archivo se escribe antes de insertar en la BD: si la BD falla, queda un
  // archivo huérfano en disco (aceptable), en vez de una fila sin archivo.
  await fs.writeFile(path.join(RUTA_UPLOADS_RESULTADOS, nombreArchivo), bufferFinal);

  return ResultadoLaboratorioDAO.ejecutarEnTransaccion(async (client) => {
    const resultado = await ResultadoLaboratorioDAO.crear({
      id_expediente: expediente.id_expediente,
      categoria,
      ruta_archivo: nombreArchivo,
      token_publico: token,
      fecha_expiracion: calcularFechaExpiracion(),
      id_usuario_subida: id_usuario,
    }, client);

    await BitacoraLaboratorioService.registrarCambio({
      id_usuario,
      entidad: 'resultado_laboratorio',
      id_entidad: resultado.id_resultado,
      accion: 'crear',
      nuevo: resultado,
    }, client);

    return resultado;
  });
};

const esVigente = (resultado) => (
  resultado.estado === 'vigente' && new Date(resultado.fecha_expiracion) > new Date()
);

const listarPorPaciente = async (id_paciente) => {
  const resultados = await ResultadoLaboratorioDAO.listarPorPaciente(id_paciente);
  return resultados.map((resultado) => ({ ...resultado, vigente: esVigente(resultado) }));
};

const anularResultado = async (id_resultado, motivo_anulacion, id_usuario) => ResultadoLaboratorioDAO.ejecutarEnTransaccion(async (client) => {
  const resultado = await ResultadoLaboratorioDAO.obtenerParaActualizar(id_resultado, client);
  if (!resultado) throw noEncontrado();
  if (resultado.estado === 'anulado') {
    lanzarError('El resultado ya esta anulado', 409);
  }

  const actualizado = await ResultadoLaboratorioDAO.anular(id_resultado, motivo_anulacion, client);

  await BitacoraLaboratorioService.registrarCambio({
    id_usuario,
    entidad: 'resultado_laboratorio',
    id_entidad: id_resultado,
    accion: 'anular',
    anterior: resultado,
    nuevo: actualizado,
  }, client);

  return actualizado;
});

const obtenerCategoriasSugeridas = async (id_laboratorio) => ResultadoLaboratorioDAO.obtenerCategoriasSugeridas(id_laboratorio);

const obtenerPublico = async (token) => {
  const resultado = await ResultadoLaboratorioDAO.obtenerPorToken(token);
  if (!resultado || !esVigente(resultado)) {
    lanzarError('El enlace no esta disponible', 404);
  }
  return resultado;
};

let idUsuarioSistemaCache = null;
const obtenerIdUsuarioSistema = async () => {
  if (idUsuarioSistemaCache) return idUsuarioSistemaCache;
  const usuario = await UsuarioDAO.obtenerPorCorreo(CORREO_USUARIO_SISTEMA);
  if (!usuario) {
    throw new Error(
      'No existe el usuario de sistema para el vencimiento automatico de resultados. '
      + 'Ejecuta la migracion usuario_sistema.sql.',
    );
  }
  idUsuarioSistemaCache = usuario.id_usuario;
  return idUsuarioSistemaCache;
};

// Marca como 'vencido' (y borra el archivo físico) cada resultado cuya
// fecha_expiracion ya pasó. Pensado para correr periódicamente (ver cron en
// backend/src/index.js). Devuelve cuántos resultados se purgaron.
const purgarResultadosVencidos = async () => {
  const idUsuarioSistema = await obtenerIdUsuarioSistema();
  const pendientes = await ResultadoLaboratorioDAO.listarVencidosPendientes();

  let purgados = 0;
  for (const resultado of pendientes) {
    const actualizado = await ResultadoLaboratorioDAO.ejecutarEnTransaccion(async (client) => {
      const fila = await ResultadoLaboratorioDAO.obtenerParaActualizar(resultado.id_resultado, client);
      if (!fila || fila.estado !== 'vigente') return null;

      const vencido = await ResultadoLaboratorioDAO.marcarVencido(
        resultado.id_resultado,
        MOTIVO_VENCIMIENTO_AUTOMATICO,
        client,
      );

      await BitacoraLaboratorioService.registrarCambio({
        id_usuario: idUsuarioSistema,
        entidad: 'resultado_laboratorio',
        id_entidad: resultado.id_resultado,
        accion: 'vencer',
        anterior: fila,
        nuevo: vencido,
      }, client);

      return vencido;
    });

    if (actualizado) {
      purgados += 1;
      try {
        await fs.unlink(path.join(RUTA_UPLOADS_RESULTADOS, actualizado.ruta_archivo));
      } catch {
        // Archivo ya ausente o inaccesible: aceptable, ya no es alcanzable vía BD.
      }
    }
  }
  return purgados;
};

module.exports = {
  subirResultado,
  listarPorPaciente,
  anularResultado,
  obtenerCategoriasSugeridas,
  obtenerPublico,
  purgarResultadosVencidos,
};
