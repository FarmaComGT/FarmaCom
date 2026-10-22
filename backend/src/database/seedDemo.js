const fs = require('fs/promises');
const path = require('path');

const rutaEnvRaiz = path.resolve(__dirname, '../../../.env');
require('dotenv').config({ path: rutaEnvRaiz });

const pool = require('./db');

const RUTA_SEED_DEMO = path.join(__dirname, 'seeds', 'demo.sql');
const ENTORNOS_PERMITIDOS = new Set(['development', 'test']);

const validarEntorno = (entorno) => {
  if (!ENTORNOS_PERMITIDOS.has(entorno)) {
    throw new Error(
      'El seed de demostración sólo puede ejecutarse con NODE_ENV=development o NODE_ENV=test.',
    );
  }
};

const ejecutarSeedDemo = async ({
  conexion = pool,
  entorno = process.env.NODE_ENV,
  logger = console,
  ruta = RUTA_SEED_DEMO,
} = {}) => {
  validarEntorno(entorno);
  const contenido = await fs.readFile(ruta, 'utf8');
  const cliente = await conexion.connect();

  try {
    await cliente.query('BEGIN');
    await cliente.query(contenido);
    await cliente.query('COMMIT');
    logger.log('Datos de demostración cargados correctamente.');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};

if (require.main === module) {
  ejecutarSeedDemo()
    .catch((error) => {
      console.error('Error al cargar los datos de demostración:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = {
  ejecutarSeedDemo,
  validarEntorno,
};
