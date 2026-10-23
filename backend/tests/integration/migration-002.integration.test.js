const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NOMBRE_ESQUEMA = 'catalogos_eliminacion_migration_test';
const rutaMigracion = path.join(
  __dirname,
  '../../src/database/migrations/versioned/002_eliminacion_segura_catalogos.sql',
);

const entreComillas = (identificador) => `"${identificador.replaceAll('"', '""')}"`;

describe('migración 002: eliminación segura de catálogos', () => {
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
      CREATE TABLE casa_farmaceutica (
        id_casa SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL
      );

      CREATE TABLE proveedor (
        id_proveedor SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL
      );

      CREATE TABLE producto (
        id_producto SERIAL PRIMARY KEY,
        id_casa INTEGER NOT NULL REFERENCES casa_farmaceutica(id_casa),
        id_proveedor INTEGER,
        CONSTRAINT fk_producto_proveedor
          FOREIGN KEY (id_proveedor)
          REFERENCES proveedor(id_proveedor)
          ON DELETE SET NULL
      );

      CREATE TABLE lote (
        id_lote SERIAL PRIMARY KEY,
        id_producto INTEGER NOT NULL REFERENCES producto(id_producto),
        id_proveedor INTEGER NOT NULL REFERENCES proveedor(id_proveedor),
        id_sucursal INTEGER NOT NULL
      );

      INSERT INTO casa_farmaceutica (nombre) VALUES ('Casa histórica');
      INSERT INTO proveedor (nombre) VALUES ('Proveedor histórico');
      INSERT INTO producto (id_casa, id_proveedor) VALUES (1, 1);
      INSERT INTO lote (id_producto, id_proveedor, id_sucursal) VALUES (1, 1, 10);
    `);
  });

  afterAll(async () => {
    if (cliente) {
      await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
      cliente.release();
    }
    await pool.end();
  });

  test('preserva relaciones y bloquea la eliminación física de un proveedor utilizado', async () => {
    const migracion = fs.readFileSync(rutaMigracion, 'utf8');

    await expect(cliente.query(migracion)).resolves.toBeDefined();
    await expect(cliente.query(migracion)).resolves.toBeDefined();

    await expect(
      cliente.query(`DELETE FROM ${esquema}.proveedor WHERE id_proveedor = 1`),
    ).rejects.toMatchObject({ code: '23503' });

    const producto = await cliente.query(
      `SELECT id_casa, id_proveedor FROM ${esquema}.producto WHERE id_producto = 1`,
    );
    expect(producto.rows).toEqual([{ id_casa: 1, id_proveedor: 1 }]);

    const indices = await cliente.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1
         AND indexname IN ('idx_producto_casa', 'idx_producto_proveedor', 'idx_lote_proveedor')
       ORDER BY indexname`,
      [NOMBRE_ESQUEMA],
    );
    expect(indices.rows.map(({ indexname }) => indexname)).toEqual([
      'idx_lote_proveedor',
      'idx_producto_casa',
      'idx_producto_proveedor',
    ]);
  });
});
