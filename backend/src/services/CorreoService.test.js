const net = require('net');
const Correo = require('./CorreoService');

test('envía por SMTP local un correo MIME con adjunto en memoria', async () => {
  const original = process.env;
  let recibido = '';
  const conexiones = new Set();
  const server = net.createServer((socket) => {
    conexiones.add(socket);
    socket.on('close', () => conexiones.delete(socket));
    socket.write('220 localhost SMTP de prueba\r\n');
    let buffer = '';
    let data = false;
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const fin = buffer.indexOf('\r\n');
        const linea = buffer.slice(0, fin); buffer = buffer.slice(fin + 2);
        if (data) {
          if (linea === '.') { data = false; socket.write('250 Mensaje aceptado\r\n'); }
          else recibido += `${linea}\r\n`;
        } else if (linea.startsWith('EHLO')) socket.write('250-localhost\r\n250 SIZE 1000000\r\n');
        else if (linea === 'DATA') { data = true; socket.write('354 Enviar contenido\r\n'); }
        else if (linea === 'QUIT') socket.end('221 Adiós\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    process.env = { NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(server.address().port),
      SMTP_REQUIRE_TLS: 'false', CORREO_REMITENTE: 'FarmaCom <reportes@farmacom.test>' };
    const pdf = Buffer.from('%PDF-1.7 prueba con bytes');
    const resultado = await Correo.enviar({ destinatario: 'dueno@example.com', asunto: 'Resumen del día',
      texto: 'Resumen provisional de ventas.', messageId: '<prueba@farmacom.local>',
      adjuntos: [{ filename: 'resumen.pdf', content: pdf, contentType: 'application/pdf' }] });
    expect(resultado.messageId).toBe('<prueba@farmacom.local>');
    expect(recibido).toContain('To: dueno@example.com');
    expect(recibido).toContain('Content-Type: application/pdf');
    expect(recibido).toContain(pdf.toString('base64'));
  } finally {
    process.env = original;
    for (const socket of conexiones) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});
