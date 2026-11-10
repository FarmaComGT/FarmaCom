require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { purgarResultadosVencidos } = require('./services/ResultadoLaboratorioService');
const { ejecutar: procesarResumenes } = require('./services/ResumenDiarioTareasService');
const { ejecutar: procesarPagosPOSVencidos } = require('./services/VentaPagoPOSTareasService');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// La API registra el trabajo y responde; el envío se procesa fuera de la petición.
if (process.env.SMTP_HOST) {
  procesarResumenes();
  cron.schedule('*/15 * * * * *', procesarResumenes, { noOverlap: true });
}

// Solicita la cancelaciÃ³n de cobros POS que llevan tres minutos sin resolverse.
// Recurrente sigue siendo la fuente de verdad: las reservas sÃ³lo se liberan
// cuando el proveedor confirma un estado final sin pago.
if (process.env.RECURRENTE_SECRET_KEY) {
  let procesandoVencimientosPOS = false;
  const ejecutarVencimientosPOS = async () => {
    if (procesandoVencimientosPOS) return;
    procesandoVencimientosPOS = true;
    try {
      await procesarPagosPOSVencidos();
    } catch (error) {
      console.error('Error al procesar vencimientos de pagos POS:', error.message);
    } finally {
      procesandoVencimientosPOS = false;
    }
  };
  ejecutarVencimientosPOS();
  cron.schedule('*/15 * * * * *', ejecutarVencimientosPOS, { noOverlap: true });
}

// Se ejecuta diariamente a las 3:00 a. m. para marcar como vencidos y borrar
// del disco los resultados cuya fecha de expiración ya pasó (seis meses).
cron.schedule('0 3 * * *', () => {
  purgarResultadosVencidos().catch((error) => {
    console.error('Error al purgar resultados de laboratorio vencidos:', error);
  });
});
