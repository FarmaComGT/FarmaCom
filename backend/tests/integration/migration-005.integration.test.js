const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NOMBRE_ESQUEMA = 'vista_lote_fecha_ingreso_migration_test';
const rutaMigracion = path.join(
  __dirname,
  '../../src/database/migrations/versioned/005_vista_lote_fecha_ingreso.sql',
);

const entreComillas = (identificador) => `"${identificador.replaceAll('"', '""')}"`;

describe('migración 005: fecha de ingreso en la vista de lotes', () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });
  let cliente;
  const esquema = entreComillas(NOMBRE_ESQUEMA);

  beforeAll(async () => {
    if (!process.env.POSTGRES_DB?.toLowerCase().includes('integration')) {
      throw new Error('La migración sólo se prueba en una base de integración.');
    }

    cliente = await pool.connect();
    await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
    await cliente.query(`CREATE SCHEMA ${esquema}`);
    await cliente.query(`SET search_path TO ${esquema}`);
    await cliente.query(`
      CREATE TABLE producto (
        id_producto SERIAL PRIMARY KEY,
        meses_alerta_vencimiento INTEGER NOT NULL,
        stock_minimo INTEGER NOT NULL
      );

      CREATE TABLE lote (
        id_lote SERIAL PRIMARY KEY,
        id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
        fecha_vencimiento DATE,
        stock_actual INTEGER NOT NULL
      );

      CREATE VIEW v_lote_estado AS
      SELECT
        l.*,
        'normal'::TEXT AS estado_vencimiento,
        'normal'::TEXT AS estado_stock
      FROM lote l;

      ALTER TABLE lote
        ADD COLUMN fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
  });

  afterAll(async () => {
    if (cliente) {
      await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
      cliente.release();
    }
    await pool.end();
  });

  test('recrea la vista con fecha_ingreso y es idempotente', async () => {
    const migracion = fs.readFileSync(rutaMigracion, 'utf8');

    await expect(cliente.query(migracion)).resolves.toBeDefined();
    await expect(cliente.query(migracion)).resolves.toBeDefined();

    const columnas = await cliente.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = 'v_lote_estado'
       ORDER BY ordinal_position`,
      [NOMBRE_ESQUEMA],
    );

    expect(columnas.rows.map(({ column_name }) => column_name)).toEqual([
      'id_lote',
      'id_producto',
      'fecha_vencimiento',
      'stock_actual',
      'fecha_ingreso',
      'estado_vencimiento',
      'estado_stock',
    ]);
  });
});
