const nodemailer = require('nodemailer');
const { obtenerConfiguracionCorreo } = require('../config/correo');

const enviar = async ({ destinatario, asunto, texto, adjuntos, messageId }) => {
  const { from, opciones } = obtenerConfiguracionCorreo();
  const transport = nodemailer.createTransport(opciones);
  const resultado = await transport.sendMail({
    from, to: { address: destinatario }, subject: asunto, text: texto, messageId,
    attachments: adjuntos, disableFileAccess: true, disableUrlAccess: true,
  });
  if (!resultado.accepted?.length) {
    const error = new Error('El servidor de correo rechazó el destinatario');
    error.code = 'EENVELOPE';
    throw error;
  }
  return { messageId: resultado.messageId };
};
module.exports = { enviar };
