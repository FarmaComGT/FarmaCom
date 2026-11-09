const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

async function comprobarCupo(pool) {
  const ventas = require('../../src/services/VentaService');
  const promociones = require('../../src/services/PromocionService');
  const dao = require('../../src/daos/PromocionDAO');
  const productos = require('../../src/daos/ProductoDAO');
  const recurrente = require('../../src/services/RecurrenteService');
  const originales = { comando: recurrente.crearComandoTerminal, firma: recurrente.verificarFirmaWebhook, evento: recurrente.normalizarEventoWebhook, terminal: process.env.RECURRENTE_TERMINAL_ID };
  const { rows: [base] } = await pool.query(`SELECT l.*, sc.id_sesion_caja, sc.id_usuario_apertura
    FROM lote l JOIN producto p USING (id_producto)
    JOIN caja c ON c.id_sucursal = l.id_sucursal AND c.nombre = 'Caja Integración CI'
    JOIN sesion_caja sc ON sc.id_caja = c.id_caja AND sc.estado = 'abierta'
    WHERE p.codigo = 'INT-ACIDO-001' LIMIT 1`);
  assert.ok(base, 'Faltan los datos de integración');
  const codigo = 'CUPO-' + randomUUID();
  const { rows: [producto] } = await pool.query(`INSERT INTO producto (codigo, nombre_comercial, nombre_generico,
    concentracion, id_presentacion, id_categoria, id_casa, stock_minimo, meses_alerta_vencimiento)
    SELECT $1, $1, $1, concentracion, id_presentacion, id_categoria, id_casa, 0, 3
    FROM producto WHERE id_producto = $2 RETURNING *`, [codigo, base.id_producto]);
  const lotes = [];
  for (const numero of ['A', 'B']) {
    const { rows: [lote] } = await pool.query(`INSERT INTO lote (id_producto, id_proveedor, id_sucursal,
      numero_lote, cantidad_ingresada, stock_actual, precio_compra, precio_venta, margen_ganancia)
      VALUES ($1, $2, $3, $4, 100, 100, 5, 15, 2) RETURNING *`,
    [producto.id_producto, base.id_proveedor, base.id_sucursal, codigo + numero]);
    lotes.push(lote);
  }
  const usuario = { id_usuario: base.id_usuario_apertura, rol: 'dueno' };
  const datos = (id_lote, cantidad, cambios = {}) => ({ id_sucursal: base.id_sucursal,
    id_sesion_caja: base.id_sesion_caja, metodo_pago: 'efectivo', monto_recibido: 1000,
    detalles: [{ id_lote, cantidad }], ...cambios });
  const crear = (cantidad_maxima) => promociones.crearPromocion(producto.id_producto, {
    id_sucursal: base.id_sucursal, cantidad_minima: 1, precio_promocion: 8,
    fecha_inicio: '2000-01-01', fecha_fin: null, cantidad_maxima,
  });
  const saldo = (p) => dao.obtenerPorId(p.id_promocion);
  let p = await crear(5);

  // Distintos lotes: el bloqueo de stock no serializa estas ventas.
  const concurrentes = await Promise.all(lotes.map((l) => ventas.crearVenta(datos(l.id_lote, 4), usuario)));
  assert.deepEqual(concurrentes.map((v) => Number(v.total)).sort((a, b) => a - b), [32, 53]);
  assert.equal(Number((await saldo(p)).cantidad_vendida), 5);
  assert.equal(Number((await saldo(p)).cantidad_disponible), 0);
  assert.equal(concurrentes.flatMap((v) => v.detalles).filter((d) => Number(d.precio_unitario) === 8).reduce((s, d) => s + d.cantidad, 0), 5);
  assert.ok((await productos.obtenerLotesParaLectura(producto.id_producto, base.id_sucursal)).every((l) => !l.id_promocion));

  const aAnular = concurrentes.find((v) => Number(v.total) === 53);
  const liberar = aAnular.detalles.filter((d) => Number(d.precio_unitario) === 8).reduce((s, d) => s + d.cantidad, 0);
  await ventas.anularVenta(aAnular.id_venta, 'Prueba de devolución del cupo', usuario);
  assert.equal(Number((await saldo(p)).cantidad_disponible), liberar);
  await assert.rejects(ventas.anularVenta(aAnular.id_venta, 'Segundo intento', usuario), { status: 409 });
  assert.equal(Number((await saldo(p)).cantidad_disponible), liberar);
  await assert.rejects(promociones.actualizarPromocion(p.id_promocion, { cantidad_maxima: 5 - liberar - 1 }), { status: 409 });
  const antes = await saldo(p);
  await assert.rejects(ventas.crearVenta(datos(lotes[0].id_lote, 3, { total_esperado: '0.01' }), usuario), (e) => e.status === 409 && e.details[0].codigo === 'COTIZACION_CAMBIO');
  assert.equal((await saldo(p)).cantidad_disponible, antes.cantidad_disponible);
  await assert.rejects(ventas.crearVenta(datos(lotes[0].id_lote, 3, { monto_recibido: 1 }), usuario), { status: 400 });
  assert.equal((await saldo(p)).cantidad_disponible, antes.cantidad_disponible);
  await dao.cambiarActivo(p.id_promocion, false);

  try {
    process.env.RECURRENTE_TERMINAL_ID = 'terminal-ficticia-integracion';
    recurrente.crearComandoTerminal = async () => ({ id: randomUUID(), status: 'dispatched' });
    recurrente.verificarFirmaWebhook = () => {};
    recurrente.normalizarEventoWebhook = (evento) => evento;
    const evento = (pago, estado = 'succeeded') => ({ externalId: pago.external_id, idEvento: randomUUID(),
      estado, eventType: 'payment_intent.' + estado, amountInCents: Number(pago.total) * 100,
      currency: 'GTQ', referenciaPago: 'pi_' + randomUUID() });

    p = await crear(3);
    const pago = await ventas.crearPagoPOS(datos(lotes[0].id_lote, 4), usuario);
    assert.equal(Number(pago.total), 39);
    assert.equal(Number((await saldo(p)).cantidad_reservada), 3);
    const otra = await ventas.crearVenta(datos(lotes[1].id_lote, 1), usuario);
    assert.equal(Number(otra.total), 15);
    const exito = evento(pago);
    // Ampliar el cupo durante el cobro no debe cambiar el importe ya enviado.
    await promociones.actualizarPromocion(p.id_promocion, { cantidad_maxima: 10 });
    const confirmado = await ventas.procesarWebhookRecurrente(exito, {});
    assert.equal(confirmado.estado, 'pagado');
    assert.equal(Number((await saldo(p)).cantidad_reservada), 0);
    assert.equal(Number((await saldo(p)).cantidad_vendida), 3);
    assert.equal((await ventas.obtenerPorId(confirmado.id_venta, usuario)).detalles.length, 2);
    await ventas.procesarWebhookRecurrente(exito, {});
    assert.equal(Number((await saldo(p)).cantidad_vendida), 3);
    await dao.cambiarActivo(p.id_promocion, false);

    p = await crear(3);
    recurrente.crearComandoTerminal = async () => { throw new Error('Terminal desconectada'); };
    await assert.rejects(ventas.crearPagoPOS(datos(lotes[0].id_lote, 4), usuario));
    assert.equal(Number((await saldo(p)).cantidad_disponible), 3);
    recurrente.crearComandoTerminal = async () => ({ id: randomUUID(), status: 'dispatched' });
    for (const estado of ['failed', 'canceled']) {
      const pendiente = await ventas.crearPagoPOS(datos(lotes[0].id_lote, 4), usuario);
      await ventas.procesarWebhookRecurrente(evento(pendiente, estado), {});
      assert.equal(Number((await saldo(p)).cantidad_disponible), 3);
    }
    const rechazado = await ventas.crearPagoPOS(datos(lotes[0].id_lote, 4), usuario);
    await ventas.procesarWebhookRecurrente({ ...evento(rechazado), amountInCents: 1 }, {});
    assert.equal(Number((await saldo(p)).cantidad_disponible), 3);

    // Un webhook rápido no debe quedar sobrescrito por la respuesta del comando.
    recurrente.crearComandoTerminal = async ({ externalId, totalCentavos }) => {
      await ventas.procesarWebhookRecurrente(evento({ external_id: externalId, total: totalCentavos / 100 }), {});
      return { id: randomUUID(), status: 'dispatched' };
    };
    const inmediato = await ventas.crearPagoPOS(datos(lotes[0].id_lote, 4), usuario);
    assert.equal(inmediato.estado, 'pagado');
    assert.equal(Number((await saldo(p)).cantidad_reservada), 0);
    assert.equal(Number((await saldo(p)).cantidad_vendida), 3);
  } finally {
    recurrente.crearComandoTerminal = originales.comando;
    recurrente.verificarFirmaWebhook = originales.firma;
    recurrente.normalizarEventoWebhook = originales.evento;
    if (originales.terminal == null) delete process.env.RECURRENTE_TERMINAL_ID;
    else process.env.RECURRENTE_TERMINAL_ID = originales.terminal;
  }
}

module.exports = { comprobarCupo };
if (require.main === module) {
  const pool = require('../../src/database/db');
  require('./preparar-base').prepararBaseIntegracion(pool).then(() => comprobarCupo(pool))
    .then(() => console.log('OK: cupo concurrente, precio mixto, anulaciones, reservas, pagos fallidos, duplicados y cotización actualizada.'))
    .catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
}
