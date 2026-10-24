const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NOMBRE_ESQUEMA = 'contactos_cliente_migration_test';
const rutaMigracion = path.join(
  __dirname,
  '../../src/database/migrations/versioned/003_contactos_cliente.sql',
);

const entreComillas = (identificador) => `"${identificador.replaceAll('"', '""')}"`;

describe('migración 003: contactos de clientes', () => {
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
      CREATE TABLE cliente (
        id_cliente SERIAL PRIMARY KEY,
        nombre_cliente VARCHAR(150) NOT NULL,
        nit VARCHAR(20),
        observaciones TEXT
      );

      INSERT INTO cliente (nombre_cliente, nit) VALUES ('Cliente existente', '1234567-K');
      INSERT INTO cliente (nombre_cliente) VALUES ('Otro cliente');
    `);
  });

  afterAll(async () => {
    if (cliente) {
      await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
      cliente.release();
    }
    await pool.end();
  });

  test('crea las tablas de contactos sin alterar los clientes existentes y es idempotente', async () => {
    const migracion = fs.readFileSync(rutaMigracion, 'utf8');

    await expect(cliente.query(migracion)).resolves.toBeDefined();
    await expect(cliente.query(migracion)).resolves.toBeDefined();

    const clientes = await cliente.query(
      `SELECT id_cliente, nombre_cliente, nit FROM ${esquema}.cliente ORDER BY id_cliente`,
    );
    expect(clientes.rows).toEqual([
      { id_cliente: 1, nombre_cliente: 'Cliente existente', nit: '1234567-K' },
      { id_cliente: 2, nombre_cliente: 'Otro cliente', nit: null },
    ]);
  });

  test('permite varios contactos por cliente y rechaza duplicados dentro del mismo cliente', async () => {
    await cliente.query(`
      INSERT INTO ${esquema}.cliente_telefono (id_cliente, numero)
      VALUES (1, '55551234'), (1, '+50255554321'), (2, '55551234');
      INSERT INTO ${esquema}.cliente_email (id_cliente, correo)
      VALUES (1, 'ana@farmacom.test'), (1, 'ana.trabajo@farmacom.test'), (2, 'ana@farmacom.test');
    `);

    await expect(
      cliente.query(`INSERT INTO ${esquema}.cliente_telefono (id_cliente, numero) VALUES (1, '55551234')`),
    ).rejects.toMatchObject({ code: '23505' });

    await expect(
      cliente.query(`INSERT INTO ${esquema}.cliente_email (id_cliente, correo) VALUES (1, 'ANA@farmacom.test')`),
    ).rejects.toMatchObject({ code: '23505' });
  });

  test('rechaza teléfonos con formato inválido', async () => {
    await expect(
      cliente.query(`INSERT INTO ${esquema}.cliente_telefono (id_cliente, numero) VALUES (1, '5555-12')`),
    ).rejects.toMatchObject({ code: '23514' });
  });

  test('elimina los contactos junto con el cliente', async () => {
    await cliente.query(`DELETE FROM ${esquema}.cliente WHERE id_cliente = 2`);

    const telefonos = await cliente.query(
      `SELECT COUNT(*)::int AS total FROM ${esquema}.cliente_telefono WHERE id_cliente = 2`,
    );
    const correos = await cliente.query(
      `SELECT COUNT(*)::int AS total FROM ${esquema}.cliente_email WHERE id_cliente = 2`,
    );
    expect(telefonos.rows[0].total).toBe(0);
    expect(correos.rows[0].total).toBe(0);
  });
});
