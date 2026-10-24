const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { Pool } = require('pg');
const { ejecutarMigraciones } = require('../../src/database/migrate');
const { validarBaseIntegracion } = require('./preparar-base');

const NOMBRE_ESQUEMA = 'ejecutor_migraciones_integration_test';
const ARCHIVO_MIGRACION = '900_migracion_artificial.sql';
const entreComillas = (identificador) => `"${identificador.replaceAll('"', '""')}"`;

describe('ejecutor de migraciones con PostgreSQL real', () => {
  let directorio;
  let pool;

  beforeAll(async () => {
    validarBaseIntegracion();
    directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'farmacom-migrations-'));

    const administrador = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
    await administrador.query(`DROP SCHEMA IF EXISTS ${entreComillas(NOMBRE_ESQUEMA)} CASCADE`);
    await administrador.query(`CREATE SCHEMA ${entreComillas(NOMBRE_ESQUEMA)}`);
    await administrador.end();

    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      options: `-c search_path=${NOMBRE_ESQUEMA}`,
    });
  });

  afterAll(async () => {
    if (pool) await pool.end();

    const administrador = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
    await administrador.query(`DROP SCHEMA IF EXISTS ${entreComillas(NOMBRE_ESQUEMA)} CASCADE`);
    await administrador.end();
    if (directorio) await fs.rm(directorio, { recursive: true, force: true });
  });

  test('registra, no repite y detecta cambios en una migración aplicada', async () => {
    const rutaMigracion = path.join(directorio, ARCHIVO_MIGRACION);
    const contenidoOriginal = `
      CREATE TABLE comprobacion_migracion (
        id INTEGER PRIMARY KEY,
        descripcion TEXT NOT NULL
      );
      INSERT INTO comprobacion_migracion (id, descripcion)
      VALUES (1, 'Migración aplicada una sola vez');
    `;
    await fs.writeFile(rutaMigracion, contenidoOriginal, 'utf8');

    await expect(ejecutarMigraciones({
      conexion: pool,
      directorio,
      logger: { log: () => {} },
    })).resolves.toEqual({ aplicadas: 1, total: 1 });

    const historial = await pool.query(
      'SELECT nombre, length(checksum)::INTEGER AS longitud_checksum FROM schema_migrations',
    );
    expect(historial.rows).toEqual([{
      nombre: ARCHIVO_MIGRACION,
      longitud_checksum: 64,
    }]);

    await expect(ejecutarMigraciones({
      conexion: pool,
      directorio,
      logger: { log: () => {} },
    })).resolves.toEqual({ aplicadas: 0, total: 1 });

    const filas = await pool.query('SELECT * FROM comprobacion_migracion');
    expect(filas.rows).toEqual([{
      id: 1,
      descripcion: 'Migración aplicada una sola vez',
    }]);

    await fs.writeFile(
      rutaMigracion,
      `${contenidoOriginal}\n-- modificación posterior no permitida\n`,
      'utf8',
    );

    await expect(ejecutarMigraciones({
      conexion: pool,
      directorio,
      logger: { log: () => {} },
    })).rejects.toThrow(`La migración ${ARCHIVO_MIGRACION} fue modificada después de aplicarse.`);
  });
});
