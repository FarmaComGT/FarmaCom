const fs = require('fs/promises');
const path = require('path');
const { ejecutarMigraciones } = require('../../src/database/migrate');

const RUTA_ESQUEMA = path.join(__dirname, '../../src/database/schema.sql');
const RUTA_FIXTURES = path.join(__dirname, 'fixtures.sql');

const validarBaseIntegracion = () => {
  const nombreBase = process.env.POSTGRES_DB;
  if (!nombreBase || !nombreBase.toLowerCase().includes('integration')) {
    throw new Error(
      'Las pruebas solo pueden ejecutarse sobre una base cuyo nombre incluya "integration".',
    );
  }
};

const prepararBaseIntegracion = async (pool) => {
  validarBaseIntegracion();

  const [esquema, fixtures] = await Promise.all([
    fs.readFile(RUTA_ESQUEMA, 'utf8'),
    fs.readFile(RUTA_FIXTURES, 'utf8'),
  ]);

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `);
  await pool.query(esquema);
  await ejecutarMigraciones({ conexion: pool, logger: { log: () => {} } });
  await pool.query(fixtures);
};

module.exports = { prepararBaseIntegracion, validarBaseIntegracion };
