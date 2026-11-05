const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const esquema = `qa_resumen_${crypto.randomBytes(6).toString('hex')}`;
const conexion = { host: process.env.DB_HOST, port: process.env.DB_PORT,
  database: process.env.POSTGRES_DB, user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD };
let mockPool;
jest.mock('../../src/database/db', () => ({
  query: (...args) => mockPool.query(...args), connect: () => mockPool.connect(),
}));
const Programacion = require('../../src/daos/ResumenDiarioProgramacionDAO');
const Envios = require('../../src/daos/ResumenDiarioEnvioDAO');
const generar = async (config) => ({ fecha: config.fecha, corte: new Date().toISOString(), estado: 'provisional' });

beforeAll(async () => {
  const admin = new Pool(conexion);
  try { await admin.query(`CREATE SCHEMA ${esquema}`); } finally { await admin.end(); }
  // Sin public en search_path: ninguna tabla de la farmacia se modifica.
  mockPool = new Pool({ ...conexion, options: `-c search_path=${esquema}` });
  await mockPool.query(`CREATE TABLE usuario (id_usuario INTEGER PRIMARY KEY, rol TEXT, estado_usuario TEXT);
    CREATE TABLE sucursal (id_sucursal INTEGER PRIMARY KEY);`);
  for (const archivo of ['009_resumen_diario_configuracion_historial.sql',
    '010_resumen_diario_envios.sql', '011_resumen_diario_programacion.sql']) {
    await mockPool.query(await fs.readFile(path.join(__dirname, '../../src/database/migrations/versioned', archivo), 'utf8'));
  }
});
afterAll(async () => {
  if (mockPool) {
    // Identificador aleatorio con prefijo fijo, exclusivo de esta prueba.
    if (!/^qa_resumen_[a-f0-9]{12}$/.test(esquema)) throw new Error('Esquema de prueba inválido');
    try { await mockPool.query(`DROP SCHEMA ${esquema} CASCADE`); } finally { await mockPool.end(); }
  }
});
beforeEach(async () => {
  await mockPool.query(`TRUNCATE ${esquema}.usuario CASCADE;
    INSERT INTO usuario VALUES (1, 'dueno', 'activo');
    INSERT INTO resumen_diario_configuracion
      (id_usuario, correo_destinatario, hora_envio, automatico, programacion_desde)
    VALUES (1, 'prueba@example.com', '23:59', true,
      (((CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date - 1)::timestamp AT TIME ZONE 'America/Guatemala'));`);
});
test('recupera un día omitido y crea copia y envío exactamente una vez', async () => {
  const primero = await Programacion.generarSiguiente(generar);
  expect(primero.id_reporte).toBeDefined();
  await Programacion.generarSiguiente(generar);
  const { rows } = await mockPool.query(`SELECT fecha::text,
    (SELECT COUNT(*)::integer FROM resumen_diario_envio WHERE id_reporte = r.id_reporte) AS envios
    FROM resumen_diario_reporte r WHERE id_reporte = $1`, [primero.id_reporte]);
  expect(rows[0].envios).toBe(1);
  const { rows: fechas } = await mockPool.query(`SELECT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date - 1)::text AS fecha`);
  expect(rows[0].fecha).toBe(fechas[0].fecha);
});
test('dos instancias no procesan simultáneamente el mismo dueño', async () => {
  let liberar;
  let notificar;
  const iniciada = new Promise((resolve) => { notificar = resolve; });
  const espera = new Promise((resolve) => { liberar = resolve; });
  const primera = Programacion.generarSiguiente(async (config) => { notificar(); await espera; return generar(config); });
  await iniciada;
  try { expect(await Programacion.generarSiguiente(generar)).toBeNull(); }
  finally { liberar(); await primera; }
});
test('revierte la operación si falla la copia y se puede recuperar en otro ciclo', async () => {
  await expect(Programacion.generarSiguiente(async () => { throw new Error('Falla de prueba'); })).rejects.toThrow('Falla de prueba');
  expect((await mockPool.query('SELECT COUNT(*)::integer AS total FROM resumen_diario_reporte')).rows[0].total).toBe(0);
  expect(await Programacion.generarSiguiente(generar)).not.toBeNull();
});
test('no programa cuentas inactivas ni configuraciones desactivadas', async () => {
  await mockPool.query("UPDATE usuario SET estado_usuario = 'inactivo'");
  expect(await Programacion.generarSiguiente(generar)).toBeNull();
  await mockPool.query("UPDATE usuario SET estado_usuario = 'activo'; UPDATE resumen_diario_configuracion SET automatico = false");
  expect(await Programacion.generarSiguiente(generar)).toBeNull();
});
test('no crea reportes anteriores al inicio de la programación', async () => {
  await mockPool.query("UPDATE resumen_diario_configuracion SET programacion_desde = CURRENT_TIMESTAMP + INTERVAL '1 day'");
  expect(await Programacion.generarSiguiente(generar)).toBeNull();
});
test('reintenta con espera y detiene el envío después de tres intentos', async () => {
  await Programacion.generarSiguiente(generar);
  for (let intento = 1; intento <= 3; intento += 1) {
    const envio = await Envios.reclamar();
    expect(envio.intentos).toBe(intento);
    await Envios.finalizar(envio.id_envio, 'fallido', null, 'Error temporal', true);
    expect(await Envios.reclamar()).toBeNull();
    if (intento < 3) {
      const { rows } = await mockPool.query('SELECT estado, proximo_intento_en > CURRENT_TIMESTAMP AS espera FROM resumen_diario_envio');
      expect(rows[0]).toEqual({ estado: 'pendiente', espera: true });
      await mockPool.query("UPDATE resumen_diario_envio SET proximo_intento_en = CURRENT_TIMESTAMP - INTERVAL '1 second'");
    }
  }
  expect((await mockPool.query('SELECT estado FROM resumen_diario_envio')).rows[0].estado).toBe('fallido');
});
test('un envío interrumpido pasa a incierto y no se reintenta', async () => {
  await Programacion.generarSiguiente(generar);
  await Envios.reclamar();
  await mockPool.query("UPDATE resumen_diario_envio SET iniciado_en = CURRENT_TIMESTAMP - INTERVAL '11 minutes'");
  await Envios.marcarInterrumpidos();
  expect(await Envios.reclamar()).toBeNull();
  expect((await mockPool.query('SELECT estado FROM resumen_diario_envio')).rows[0].estado).toBe('incierto');
});
