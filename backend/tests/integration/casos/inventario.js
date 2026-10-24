module.exports = ({ app, iniciarSesion, pool, request }) => {
  describe('Integración de productos e inventario', () => {
    test('maneja el precio de compra por lote y un vencimiento opcional', async () => {
      const { cookie } = await iniciarSesion('dueno@farma.com');
      const catalogos = await pool.query(`
        SELECT
          (SELECT id_presentacion FROM presentacion ORDER BY id_presentacion LIMIT 1) AS id_presentacion,
          (SELECT id_categoria FROM categoria ORDER BY id_categoria LIMIT 1) AS id_categoria,
          (SELECT id_casa FROM casa_farmaceutica ORDER BY id_casa LIMIT 1) AS id_casa,
          (SELECT id_proveedor FROM proveedor ORDER BY id_proveedor LIMIT 1) AS id_proveedor,
          (SELECT id_sucursal FROM sucursal ORDER BY id_sucursal LIMIT 1) AS id_sucursal
      `);
      const ids = catalogos.rows[0];
      const sufijo = Date.now();
      const codigo = `INT-LOTE-${sufijo}`;

      const producto = await request(app)
        .post('/api/productos')
        .set('Cookie', cookie)
        .send({
          codigo,
          nombre_comercial: `Producto por lote ${sufijo}`,
          nombre_generico: `Genérico por lote ${sufijo}`,
          id_presentacion: ids.id_presentacion,
          id_categoria: ids.id_categoria,
          id_casa: ids.id_casa,
          id_proveedor: ids.id_proveedor,
          stock_minimo: 2,
          meses_alerta_vencimiento: 3,
        })
        .expect(201);

      expect(producto.body).not.toHaveProperty('precio_compra');

      const lote = await request(app)
        .post('/api/lotes')
        .set('Cookie', cookie)
        .send({
          id_producto: producto.body.id_producto,
          id_proveedor: ids.id_proveedor,
          id_sucursal: ids.id_sucursal,
          numero_lote: `LT-${sufijo}`,
          fecha_vencimiento: null,
          cantidad_ingresada: 12,
          precio_compra: 8.75,
          precio_venta: 12.5,
          margen_ganancia: 42.8571,
        })
        .expect(201);

      expect(lote.body).toMatchObject({
        id_producto: producto.body.id_producto,
        fecha_vencimiento: null,
        precio_compra: '8.75',
      });

      const persistencia = await pool.query(
        `SELECT p.codigo, l.numero_lote, l.stock_actual, l.precio_compra::TEXT
         FROM producto p
         JOIN lote l ON l.id_producto = p.id_producto
         WHERE p.id_producto = $1 AND l.id_lote = $2`,
        [producto.body.id_producto, lote.body.id_lote],
      );
      expect(persistencia.rows).toEqual([{
        codigo,
        numero_lote: `LT-${sufijo}`,
        stock_actual: 12,
        precio_compra: '8.75',
      }]);

      const inventario = await request(app)
        .get(`/api/sucursales/${ids.id_sucursal}/inventario`)
        .set('Cookie', cookie)
        .expect(200);
      expect(inventario.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id_producto: producto.body.id_producto,
          stock_total: '12',
        }),
      ]));

      const autocompletado = await request(app)
        .get('/api/productos/autocompletar')
        .query({ busqueda: codigo, limite: 10 })
        .set('Cookie', cookie)
        .expect(200);
      expect(autocompletado.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id_producto: producto.body.id_producto,
          id_lote: lote.body.id_lote,
          fecha_vencimiento: null,
        }),
      ]));
    });
  });
};
