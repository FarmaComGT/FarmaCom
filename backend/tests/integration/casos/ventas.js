const obtenerContextoVenta = async (pool) => {
  const datos = await pool.query(`
    SELECT l.id_lote, l.stock_actual, l.id_sucursal, sc.id_sesion_caja
    FROM lote l
    JOIN producto p ON p.id_producto = l.id_producto
    JOIN caja c ON c.id_sucursal = l.id_sucursal
      AND c.nombre = 'Caja Integración CI'
    JOIN sesion_caja sc ON sc.id_caja = c.id_caja
      AND sc.estado = 'abierta'
    WHERE p.codigo = 'INT-ACIDO-001'
      AND l.numero_lote = 'LOTE-INTEGRACION-CI'
  `);
  return datos.rows[0];
};

module.exports = ({ app, iniciarSesion, pool, request }) => {
  describe('Integración de ventas e inventario', () => {
    test('crea y anula una venta restaurando el inventario una sola vez', async () => {
      const { cookie } = await iniciarSesion('dueno@farma.com');
      const contexto = await obtenerContextoVenta(pool);
      const stockInicial = contexto.stock_actual;

      const venta = await request(app)
        .post('/api/ventas')
        .set('Cookie', cookie)
        .send({
          id_sucursal: contexto.id_sucursal,
          id_sesion_caja: contexto.id_sesion_caja,
          id_cliente: null,
          metodo_pago: 'efectivo',
          monto_recibido: 50,
          detalles: [{ id_lote: contexto.id_lote, cantidad: 3 }],
        })
        .expect(201);

      expect(venta.body).toMatchObject({
        estado: 'completada',
        total: '45.00',
        cambio: '5.00',
      });

      const despuesVenta = await pool.query(
        `SELECT l.stock_actual, d.cantidad, d.precio_unitario::TEXT
         FROM lote l
         JOIN detalle_venta d ON d.id_lote = l.id_lote
         WHERE l.id_lote = $1 AND d.id_venta = $2`,
        [contexto.id_lote, venta.body.id_venta],
      );
      expect(despuesVenta.rows).toEqual([{
        stock_actual: stockInicial - 3,
        cantidad: 3,
        precio_unitario: '15.00',
      }]);

      const anulada = await request(app)
        .delete(`/api/ventas/${venta.body.id_venta}`)
        .set('Cookie', cookie)
        .send({ motivo_anulacion: 'Anulación controlada de integración' })
        .expect(200);
      expect(anulada.body).toMatchObject({
        estado: 'anulada',
        motivo_anulacion: 'Anulación controlada de integración',
      });

      await request(app)
        .delete(`/api/ventas/${venta.body.id_venta}`)
        .set('Cookie', cookie)
        .send({ motivo_anulacion: 'Segundo intento no permitido' })
        .expect(409);

      const stockFinal = await pool.query(
        'SELECT stock_actual FROM lote WHERE id_lote = $1',
        [contexto.id_lote],
      );
      expect(stockFinal.rows[0].stock_actual).toBe(stockInicial);
    });

    test('rechaza una venta sin stock y no deja registros parciales', async () => {
      const { cookie } = await iniciarSesion('dueno@farma.com');
      const contexto = await obtenerContextoVenta(pool);
      const ventasAntes = await pool.query('SELECT COUNT(*)::INTEGER AS total FROM venta');

      await request(app)
        .post('/api/ventas')
        .set('Cookie', cookie)
        .send({
          id_sucursal: contexto.id_sucursal,
          id_sesion_caja: contexto.id_sesion_caja,
          id_cliente: null,
          metodo_pago: 'efectivo',
          monto_recibido: 999999,
          detalles: [{
            id_lote: contexto.id_lote,
            cantidad: contexto.stock_actual + 1,
          }],
        })
        .expect(409);

      const estadoFinal = await pool.query(
        `SELECT
           (SELECT COUNT(*)::INTEGER FROM venta) AS ventas,
           (SELECT stock_actual FROM lote WHERE id_lote = $1) AS stock_actual`,
        [contexto.id_lote],
      );
      expect(estadoFinal.rows[0]).toEqual({
        ventas: ventasAntes.rows[0].total,
        stock_actual: contexto.stock_actual,
      });
    });
  });
};
