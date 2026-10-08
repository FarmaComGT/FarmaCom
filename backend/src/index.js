require('dotenv').config();
const app = require('./app');
const cron = require('node-cron');
const { purgarResultadosVencidos } = require('./services/ResultadoLaboratorioService');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Corre diario a las 3am: marca como 'vencido' y borra del disco los
// resultados de laboratorio cuya fecha_expiracion ya paso (6 meses).
cron.schedule('0 3 * * *', () => {
    purgarResultadosVencidos().catch((error) => {
        console.error('Error purgando resultados de laboratorio vencidos:', error);
    });
});
