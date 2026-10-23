const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NOMBRE_ESQUEMA = 'scrum_295_migration_test';
const rutaMigracion = path.join(
  __dirname,
  '../../src/database/migrations/versioned/001_precio_compra_por_lote.sql',
);

const entreComillas = (identificador) => `"${identificador.replaceAll('"', '""')}"`;

describe('migración 001: precio de compra por lote', () => {
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
        codigo VARCHAR(50) NOT NULL UNIQUE,
        precio_compra NUMERIC(10,2) NOT NULL CHECK (precio_compra >= 0)
      );

      CREATE TABLE lote (
        id_lote SERIAL PRIMARY KEY,
        id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
        numero_lote VARCHAR(100) NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        precio_compra NUMERIC(10,2)
      );

      INSERT INTO producto (codigo, precio_compra)
      VALUES ('PROD-1', 10.00), ('PROD-2', 20.00);

      INSERT INTO lote (id_producto, numero_lote, fecha_vencimiento, precio_compra)
      VALUES
        (1, 'LOTE-SIN-COSTO', DATE '2027-01-01', NULL),
        (2, 'LOTE-COSTO-PROPIO', DATE '2027-02-01', 18.50);
    `);
  });

  afterAll(async () => {
    if (cliente) {
      await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
      cliente.release();
    }
    await pool.end();
  });

  test('preserva datos, completa costos faltantes y aplica el modelo nuevo', async () => {
    const migracion = fs.readFileSync(rutaMigracion, 'utf8');

    await cliente.query('BEGIN');
    try {
      await cliente.query(`SET LOCAL search_path TO ${esquema}`);
      await cliente.query(migracion);
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    }

    // Una base nueva ya contiene el esquema final cuando el ejecutor registra
    // por primera vez la migración. Ejecutarla de nuevo simula ese estado y
    // comprueba que no depende de la columna antigua de producto.
    await expect(cliente.query(migracion)).resolves.toBeDefined();

    const columnasProducto = await cliente.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'producto'`,
      [NOMBRE_ESQUEMA],
    );
    expect(columnasProducto.rows.map(({ column_name }) => column_name))
      .not.toContain('precio_compra');

    const columnasLote = await cliente.query(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'lote'
         AND column_name IN ('fecha_vencimiento', 'precio_compra')
       ORDER BY column_name`,
      [NOMBRE_ESQUEMA],
    );
    expect(columnasLote.rows).toEqual([
      { column_name: 'fecha_vencimiento', is_nullable: 'YES' },
      { column_name: 'precio_compra', is_nullable: 'NO' },
    ]);

    const lotes = await cliente.query(
      `SELECT numero_lote, precio_compra::TEXT
       FROM ${esquema}.lote
       ORDER BY id_lote`,
    );
    expect(lotes.rows).toEqual([
      { numero_lote: 'LOTE-SIN-COSTO', precio_compra: '10.00' },
      { numero_lote: 'LOTE-COSTO-PROPIO', precio_compra: '18.50' },
    ]);

    await expect(cliente.query(
      `INSERT INTO ${esquema}.lote
         (id_producto, numero_lote, fecha_vencimiento, precio_compra)
       VALUES (1, 'LOTE-SIN-VENCIMIENTO', NULL, 9.75)`,
    )).resolves.toMatchObject({ rowCount: 1 });

    await expect(cliente.query(
      `INSERT INTO ${esquema}.lote
         (id_producto, numero_lote, fecha_vencimiento, precio_compra)
       VALUES (1, 'LOTE-COSTO-NEGATIVO', NULL, -1)`,
    )).rejects.toMatchObject({ code: '23514' });
  });
});
