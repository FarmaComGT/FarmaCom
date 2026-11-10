const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const { ejecutarSeedDemo } = require('../../src/database/seedDemo');

// Exclusivamente una base desechable y vacía, separada de las pruebas habituales.
const url = process.env.SEED_DEMO_TEST_URL;
const suite = url ? describe : describe.skip;
suite('demo Baja Verapaz en PostgreSQL real', () => {
  let pool;
  const env = {
    DEMO_DUENO_PASSWORD: 'Dueno-prueba-2026!',
    DEMO_LABORATORISTA_PASSWORD: 'Laboratorio-prueba-2026!',
    DEMO_ADMINISTRADOR_PASSWORD: 'Administrador-prueba-2026!',
    DEMO_DEPENDIENTE_PASSWORD: 'Dependiente-prueba-2026!',
  };
  const cargar = () => ejecutarSeedDemo({ conexion: pool, entorno: 'test', env, logger: { log() {} } });
  const resumen = async () => (await pool.query(`SELECT
    (SELECT count(*)::int FROM venta) ventas,
    (SELECT count(*)::int FROM movimiento_inventario) movimientos,
    (SELECT sum(stock_actual)::int FROM lote) stock,
    (SELECT sum(total)::text FROM venta) total`)).rows[0];

  beforeAll(async () => {
    if (!new URL(url).pathname.endsWith('_seed_test')) throw new Error('La base de prueba debe terminar en _seed_test');
    pool = new Pool({ connectionString: url });
    const tablas = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if (tablas.rowCount) throw new Error('La base de prueba debe estar vacía');
    await pool.query(await fs.readFile(path.join(__dirname, '../../src/database/schema.sql'), 'utf8'));
    const inicio = performance.now();
    await cargar();
    console.log(`Seed demo completo: ${Math.round(performance.now() - inicio)} ms`);
  });
  afterAll(async () => { if (pool) await pool.end(); });

  test('volumen fijo, tres sucursales operativas y escenarios visibles', async () => {
    expect((await resumen()).ventas).toBe(2358);
    const { rows: [r] } = await pool.query(`SELECT
      (SELECT count(*)::int FROM sucursal) sucursales,
      (SELECT count(*)::int FROM producto) productos,
      (SELECT count(*)::int FROM lote) lotes,
      (SELECT count(*)::int FROM sesion_caja WHERE estado='abierta') abiertas,
      (SELECT count(*)::int FROM sesion_caja WHERE estado='cerrada') cerradas,
      (SELECT count(*)::int FROM paciente) pacientes,
      (SELECT count(DISTINCT estado_vencimiento)::int FROM v_lote_estado) vencimientos,
      (SELECT count(DISTINCT estado_stock)::int FROM v_lote_estado) existencias`);
    expect(r).toEqual({ sucursales: 3, productos: 40, lotes: 240, abiertas: 3, cerradas: 180, pacientes: 30, vencimientos: 3, existencias: 3 });
  });
  test('tickets, cierres, fechas y sucursales mantienen consistencia', async () => {
    const { rows } = await pool.query(`SELECT 'total' AS error FROM venta v
      WHERE v.total <> (SELECT sum(subtotal) FROM detalle_venta d WHERE d.id_venta=v.id_venta)
      UNION ALL SELECT 'sucursal' FROM detalle_venta d JOIN venta v USING(id_venta) JOIN lote l USING(id_lote)
      WHERE v.id_sucursal<>l.id_sucursal
      UNION ALL SELECT 'fecha' FROM venta v JOIN sesion_caja s USING(id_sesion_caja)
      WHERE v.fecha_venta<s.fecha_hora_apertura OR v.fecha_venta>coalesce(s.fecha_hora_cierre,CURRENT_TIMESTAMP)
      UNION ALL SELECT 'cierre' FROM sesion_caja s WHERE estado='cerrada' AND
      (total_ventas_efectivo<>(SELECT coalesce(sum(total),0) FROM venta v WHERE v.id_sesion_caja=s.id_sesion_caja AND v.estado='completada' AND metodo_pago='efectivo')
      OR total_ventas_tarjeta<>(SELECT coalesce(sum(total),0) FROM venta v WHERE v.id_sesion_caja=s.id_sesion_caja AND v.estado='completada' AND metodo_pago='tarjeta')
      OR total_salidas<>(SELECT coalesce(sum(monto),0) FROM movimiento_caja m WHERE m.id_sesion_caja=s.id_sesion_caja AND tipo='salida')
      OR efectivo_esperado<>fondo_inicial+total_ventas_efectivo+total_entradas-total_salidas)`);
    expect(rows).toEqual([]);
  });
  test('contenido sin etiquetas de demostración, marcas separadas y nombres variados', async () => {
    const productos = await pool.query('SELECT nombre_comercial,nombre_generico FROM producto');
    expect(productos.rows.every(p => p.nombre_comercial !== p.nombre_generico)).toBe(true);
    const clientes = await pool.query('SELECT nombre_cliente FROM cliente');
    expect(new Set(clientes.rows.map(c => c.nombre_cliente)).size).toBe(60);
    expect(new Set(clientes.rows.map(c => c.nombre_cliente.split(' ')[0])).size).toBeGreaterThan(50);
    const tablas = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    for (const { tablename } of tablas.rows) {
      const { rows } = await pool.query(`SELECT 1 FROM "${tablename.replaceAll('"', '""')}" t WHERE to_jsonb(t)::text ~* 'demo' LIMIT 1`);
      expect({ tabla: tablename, filasConEtiqueta: rows.length }).toEqual({ tabla: tablename, filasConEtiqueta: 0 });
    }
  });
  test('actualiza contenido de una carga anterior sin alterar las ventas', async () => {
    const cliente = await pool.connect();
    const antes = await resumen();
    try {
      await cliente.query('BEGIN');
      await cliente.query("DELETE FROM seed_demo_ejecucion WHERE version='baja-verapaz-contenido-v2'");
      await cliente.query("UPDATE producto SET nombre_comercial=nombre_generico WHERE codigo='BV-001'");
      await cliente.query("UPDATE cliente SET nombre_cliente='María López Méndez',observaciones='DEMO-BV-CLIENTE-1' WHERE observaciones='Registro de cliente BV-1'");
      await cliente.query(await fs.readFile(path.join(__dirname, '../../src/database/seeds/presentacion.sql'), 'utf8'));
      expect((await cliente.query("SELECT nombre_comercial FROM producto WHERE codigo='BV-001'")).rows[0].nombre_comercial).toBe('Paraliv');
      expect((await cliente.query("SELECT nombre_cliente FROM cliente WHERE observaciones='Registro de cliente BV-1'")).rows[0].nombre_cliente).toBe('María Fernanda López Torres');
    } finally {
      await cliente.query('ROLLBACK');
      cliente.release();
    }
    expect(await resumen()).toEqual(antes);
  });
  test('kárdex continuo y saldo final idéntico al inventario', async () => {
    const { rows } = await pool.query(`WITH cadena AS (
      SELECT *,lag(cantidad_nueva,1,0) OVER (PARTITION BY id_lote ORDER BY fecha_movimiento,id_movimiento) AS anterior
      FROM movimiento_inventario
    ) SELECT 'cadena' AS error FROM cadena WHERE anterior<>cantidad_anterior
    UNION ALL SELECT 'saldo' FROM lote l WHERE stock_actual<>(SELECT cantidad_nueva FROM movimiento_inventario m
      WHERE m.id_lote=l.id_lote ORDER BY fecha_movimiento DESC,id_movimiento DESC LIMIT 1)`);
    expect(rows).toEqual([]);
  });
  test('repeticiones simultáneas no duplican ni cambian los datos', async () => {
    const antes = await resumen();
    await Promise.all([cargar(), cargar()]);
    expect(await resumen()).toEqual(antes);
  });
  test('rechaza mezclar una base existente y conserva los datos', async () => {
    const cliente = await pool.connect();
    const antes = await resumen();
    try {
      await cliente.query('BEGIN');
      await cliente.query('DELETE FROM seed_demo_ejecucion');
      const sql = await fs.readFile(path.join(__dirname, '../../src/database/seeds/demo.sql'), 'utf8');
      await expect(cliente.query(sql)).rejects.toThrow('requiere una base vacía');
    } finally {
      await cliente.query('ROLLBACK');
      cliente.release();
    }
    expect(await resumen()).toEqual(antes);
  });
});
