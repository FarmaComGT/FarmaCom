require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { purgarResultadosVencidos } = require('./services/ResultadoLaboratorioService');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Se ejecuta diariamente a las 3:00 a. m. para marcar como vencidos y borrar
// del disco los resultados cuya fecha de expiración ya pasó (seis meses).
cron.schedule('0 3 * * *', () => {
  purgarResultadosVencidos().catch((error) => {
    console.error('Error al purgar resultados de laboratorio vencidos:', error);
  });
});
