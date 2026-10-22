const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcrypt');

const rutaEnvRaiz = path.resolve(__dirname, '../../../.env');
require('dotenv').config({ path: rutaEnvRaiz });

const pool = require('./db');

const RUTA_SEED_DEMO = path.join(__dirname, 'seeds', 'demo.sql');
const ENTORNOS_PERMITIDOS = new Set(['development', 'test']);
const LONGITUD_MINIMA_CONTRASENA = 12;
const LONGITUD_MAXIMA_BCRYPT_BYTES = 72;
const BCRYPT_ROUNDS_PREDETERMINADAS = 10;

const validarEntorno = (entorno) => {
  if (!ENTORNOS_PERMITIDOS.has(entorno)) {
    throw new Error(
      'El seed de demostración sólo puede ejecutarse con NODE_ENV=development o NODE_ENV=test.',
    );
  }
};

const validarContrasenaInicial = (nombre, valor) => {
  if (typeof valor !== 'string' || valor.length < LONGITUD_MINIMA_CONTRASENA) {
    throw new Error(
      `${nombre} debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`,
    );
  }

  if (Buffer.byteLength(valor, 'utf8') > LONGITUD_MAXIMA_BCRYPT_BYTES) {
    throw new Error(
      `${nombre} no puede superar ${LONGITUD_MAXIMA_BCRYPT_BYTES} bytes.`,
    );
  }

  return valor;
};

const obtenerCredencialesDemo = (env = process.env) => {
  const contrasenaDueno = validarContrasenaInicial(
    'DEMO_DUENO_PASSWORD',
    env.DEMO_DUENO_PASSWORD,
  );
  const contrasenaLaboratorista = validarContrasenaInicial(
    'DEMO_LABORATORISTA_PASSWORD',
    env.DEMO_LABORATORISTA_PASSWORD,
  );

  if (contrasenaDueno === contrasenaLaboratorista) {
    throw new Error('Las contraseñas iniciales de demostración deben ser diferentes.');
  }

  return { contrasenaDueno, contrasenaLaboratorista };
};

const obtenerRondasBcrypt = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return BCRYPT_ROUNDS_PREDETERMINADAS;
  }

  const normalizado = String(valor).trim();
  if (!/^\d+$/.test(normalizado)) {
    throw new Error('BCRYPT_ROUNDS debe ser un entero entre 10 y 14.');
  }

  const rondas = Number(normalizado);
  if (rondas < 10 || rondas > 14) {
    throw new Error('BCRYPT_ROUNDS debe ser un entero entre 10 y 14.');
  }

  return rondas;
};

const ejecutarSeedDemo = async ({
  conexion = pool,
  entorno = process.env.NODE_ENV,
  env = process.env,
  logger = console,
  ruta = RUTA_SEED_DEMO,
  generarHash = bcrypt.hash,
} = {}) => {
  validarEntorno(entorno);
  const { contrasenaDueno, contrasenaLaboratorista } = obtenerCredencialesDemo(env);
  const rondas = obtenerRondasBcrypt(env.BCRYPT_ROUNDS);
  const [hashDueno, hashLaboratorista] = await Promise.all([
    generarHash(contrasenaDueno, rondas),
    generarHash(contrasenaLaboratorista, rondas),
  ]);
  const contenido = await fs.readFile(ruta, 'utf8');
  const cliente = await conexion.connect();

  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `SELECT
         set_config('farmacom.seed.dueno_hash', $1, true),
         set_config('farmacom.seed.laboratorista_hash', $2, true)`,
      [hashDueno, hashLaboratorista],
    );
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
  obtenerCredencialesDemo,
  obtenerRondasBcrypt,
  validarContrasenaInicial,
  validarEntorno,
};
