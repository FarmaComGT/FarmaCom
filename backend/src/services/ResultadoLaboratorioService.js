const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');
const ResultadoLaboratorioDAO = require('../daos/ResultadoLaboratorioDAO');
const { RUTA_UPLOADS_RESULTADOS, PUBLIC_API_BASE_URL } = require('../config/almacenamiento');

const MESES_VIGENCIA = 6;
const TAMANO_QR_PUNTOS = 100;
const MARGEN_QR_PUNTOS = 24;

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

    await ResultadoLaboratorioDAO.registrarBitacora({
      id_usuario,
      entidad: 'resultado_laboratorio',
      id_entidad: resultado.id_resultado,
      accion: 'crear',
      valores_nuevos: { categoria, id_paciente },
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

  await ResultadoLaboratorioDAO.registrarBitacora({
    id_usuario,
    entidad: 'resultado_laboratorio',
    id_entidad: id_resultado,
    accion: 'anular',
    valores_anteriores: { estado: resultado.estado },
    valores_nuevos: { estado: 'anulado', motivo_anulacion },
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

module.exports = {
  subirResultado,
  listarPorPaciente,
  anularResultado,
  obtenerCategoriasSugeridas,
  obtenerPublico,
};
