const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const rutaEnvRaiz = path.resolve(__dirname, '../../../.env');
require('dotenv').config({ path: rutaEnvRaiz });

const pool = require('./db');

const DIRECTORIO_PREDETERMINADO = path.join(__dirname, 'migrations', 'versioned');
const PATRON_MIGRACION = /^\d{3}_[a-z0-9_]+\.sql$/;
const CLAVE_BLOQUEO = 'farmacom_migraciones';

const calcularChecksum = (contenido) => crypto
  .createHash('sha256')
  .update(contenido, 'utf8')
  .digest('hex');

const obtenerMigraciones = async (directorio = DIRECTORIO_PREDETERMINADO) => {
  const entradas = await fs.readdir(directorio, { withFileTypes: true });
  const archivosSql = entradas
    .filter((entrada) => entrada.isFile() && entrada.name.endsWith('.sql'))
    .map((entrada) => entrada.name);

  const nombresInvalidos = archivosSql.filter((nombre) => !PATRON_MIGRACION.test(nombre));
  if (nombresInvalidos.length > 0) {
    throw new Error(
      `Las migraciones deben usar el formato 001_descripcion.sql: ${nombresInvalidos.join(', ')}`,
    );
  }

  return archivosSql.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
};

const asegurarTablaMigraciones = (cliente) => cliente.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    nombre TEXT PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const obtenerMigracionesAplicadas = async (cliente) => {
  const resultado = await cliente.query(
    'SELECT nombre, checksum FROM schema_migrations ORDER BY nombre',
  );

  return new Map(resultado.rows.map(({ nombre, checksum }) => [nombre, checksum.trim()]));
};

const aplicarMigracion = async (cliente, migracion) => {
  await cliente.query('BEGIN');

  try {
    await cliente.query(migracion.contenido);
    await cliente.query(
      'INSERT INTO schema_migrations (nombre, checksum) VALUES ($1, $2)',
      [migracion.nombre, migracion.checksum],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  }
};

const ejecutarMigraciones = async ({
  conexion = pool,
  directorio = DIRECTORIO_PREDETERMINADO,
  logger = console,
} = {}) => {
  const cliente = await conexion.connect();
  let bloqueoAdquirido = false;

  try {
    await cliente.query('SELECT pg_advisory_lock(hashtext($1))', [CLAVE_BLOQUEO]);
    bloqueoAdquirido = true;
    await asegurarTablaMigraciones(cliente);

    const nombres = await obtenerMigraciones(directorio);
    const aplicadas = await obtenerMigracionesAplicadas(cliente);
    let cantidadAplicada = 0;

    for (const nombre of nombres) {
      const ruta = path.join(directorio, nombre);
      const contenido = await fs.readFile(ruta, 'utf8');
      const checksum = calcularChecksum(contenido);
      const checksumRegistrado = aplicadas.get(nombre);

      if (checksumRegistrado && checksumRegistrado !== checksum) {
        throw new Error(
          `La migración ${nombre} fue modificada después de aplicarse.`,
        );
      }

      if (checksumRegistrado) {
        logger.log(`Migración ya aplicada: ${nombre}`);
        continue;
      }

      logger.log(`Aplicando migración: ${nombre}`);
      await aplicarMigracion(cliente, { nombre, contenido, checksum });
      cantidadAplicada += 1;
    }

    logger.log(
      cantidadAplicada === 0
        ? 'La base de datos ya está actualizada.'
        : `Migraciones aplicadas correctamente: ${cantidadAplicada}.`,
    );

    return { aplicadas: cantidadAplicada, total: nombres.length };
  } finally {
    if (bloqueoAdquirido) {
      await cliente.query('SELECT pg_advisory_unlock(hashtext($1))', [CLAVE_BLOQUEO]);
    }
    cliente.release();
  }
};

if (require.main === module) {
  ejecutarMigraciones()
    .catch((error) => {
      console.error('Error al ejecutar las migraciones:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = {
  aplicarMigracion,
  calcularChecksum,
  ejecutarMigraciones,
  obtenerMigraciones,
};
