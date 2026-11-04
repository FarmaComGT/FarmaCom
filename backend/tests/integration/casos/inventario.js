module.exports = ({ app, iniciarSesion, pool, request }) => {
  describe('Integración de productos e inventario', () => {
    test('pagina resultados reales, conserva el orden y recupera páginas vacías', async () => {
      const { cookie } = await iniciarSesion('dueno@farma.com');
      const { rows: [ids] } = await pool.query(`SELECT
        (SELECT id_presentacion FROM presentacion ORDER BY id_presentacion LIMIT 1) AS id_presentacion,
        (SELECT id_categoria FROM categoria ORDER BY id_categoria LIMIT 1) AS id_categoria,
        (SELECT id_casa FROM casa_farmaceutica ORDER BY id_casa LIMIT 1) AS id_casa,
        (SELECT id_proveedor FROM proveedor ORDER BY id_proveedor LIMIT 1) AS id_proveedor,
        (SELECT id_sucursal FROM sucursal ORDER BY id_sucursal LIMIT 1) AS id_sucursal`);
      const prefijo = `INT-PAG-${Date.now()}`;
      const { rows: creados } = await pool.query(`INSERT INTO producto
        (codigo, nombre_comercial, nombre_generico, id_presentacion, id_categoria, id_casa,
         meses_alerta_vencimiento, activo)
        SELECT $1 || '-' || n, 'Producto paginado ' || $1, 'Genérico ' || $1 || '-' || n,
          $2, $3, $4, 3, n < 27
        FROM generate_series(1, 27) AS n RETURNING id_producto, activo`,
      [prefijo, ids.id_presentacion, ids.id_categoria, ids.id_casa]);
      const ultimoActivo = creados.filter((producto) => producto.activo).at(-1);
      await pool.query(`INSERT INTO lote
        (id_producto, id_proveedor, id_sucursal, numero_lote, fecha_vencimiento,
         cantidad_ingresada, stock_actual, precio_compra, precio_venta, margen_ganancia)
        VALUES ($1, $2, $3, $4, CURRENT_DATE - 1, 10, 10, 5, 10, 100)`,
      [ultimoActivo.id_producto, ids.id_proveedor, ids.id_sucursal, prefijo]);
      const ruta = `/api/sucursales/${ids.id_sucursal}/inventario`;
      const consultar = (consulta = {}) => request(app).get(ruta).query(consulta).set('Cookie', cookie).expect(200);
      const { body: legado } = await consultar();
      expect(Array.isArray(legado)).toBe(true);
      const esperados = legado.filter((producto) => producto.codigo.startsWith(prefijo));
      expect(esperados).toHaveLength(27);
      expect(esperados[0].id_producto).toBe(ultimoActivo.id_producto);

      const paginas = [];
      for (const pagina of [1, 2, 3]) {
        const { body } = await consultar({ pagina, limite: 10, busqueda: `  ${prefijo.toLowerCase()}  ` });
        expect(body.paginacion).toEqual({ pagina, limite: 10, total: 27, total_paginas: 3 });
        expect(body.datos).toHaveLength(pagina === 3 ? 7 : 10);
        paginas.push(...body.datos.map((producto) => producto.id_producto));
      }
      expect(paginas).toEqual(esperados.map((producto) => producto.id_producto));
      expect(new Set(paginas).size).toBe(27);
      const { body: ultima } = await consultar({ pagina: 999, limite: 10, busqueda: prefijo });
      expect(ultima.paginacion.pagina).toBe(3);
      expect(ultima.datos.map((producto) => producto.id_producto)).toEqual(paginas.slice(20));

      const { body: combinados } = await consultar({ pagina: 1, busqueda: prefijo,
        activo: 'false', id_categoria: ids.id_categoria, estado_stock: 'sin_lotes', estado_vencimiento: 'sin_lotes' });
      expect(combinados.paginacion).toEqual({ pagina: 1, limite: 25, total: 1, total_paginas: 1 });
      expect(combinados.datos[0].activo).toBe(false);
      const { body: vencidos } = await consultar({ pagina: 1, busqueda: prefijo, estado_vencimiento: 'vencido' });
      expect(vencidos.datos.map((producto) => producto.id_producto)).toEqual([ultimoActivo.id_producto]);
      const { body: genericos } = await consultar({ pagina: 1, busqueda: `gENÉRICO ${prefijo}` });
      expect(genericos.paginacion.total).toBe(27);

      await pool.query('UPDATE producto SET codigo = $1 WHERE id_producto = $2',
        [`${prefijo}-%_`, ultimoActivo.id_producto]);
      const { body: literal } = await consultar({ pagina: 1, busqueda: '%_' });
      expect(literal.datos.map((producto) => producto.id_producto)).toEqual([ultimoActivo.id_producto]);

      const { body: sinResultados } = await consultar({ pagina: 99, busqueda: `${prefijo}-ausente` });
      expect(sinResultados).toEqual({ datos: [], paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 } });
      await request(app).patch(`/api/productos/${combinados.datos[0].id_producto}/estado`)
        .set('Cookie', cookie).send({ activo: true }).expect(200);
      const { body: despues } = await consultar({ pagina: 2, busqueda: prefijo, activo: 'false' });
      expect(despues).toEqual({ datos: [], paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 } });

      const { body: resumen } = await request(app).get(`${ruta}/resumen`).set('Cookie', cookie).expect(200);
      expect(Number(resumen.total_productos)).toBe(legado.length);
    });

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

      const historialPrecios = await request(app)
        .get(`/api/productos/${producto.body.id_producto}/historial-precios`)
        .set('Cookie', cookie)
        .expect(200);

      expect(historialPrecios.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id_lote: lote.body.id_lote,
          numero_lote: `LT-${sufijo}`,
          id_sucursal: ids.id_sucursal,
          tipo_precio: 'compra',
          valor_anterior: null,
          valor_nuevo: '8.75',
          origen: 'ingreso_lote',
        }),
        expect.objectContaining({
          id_lote: lote.body.id_lote,
          numero_lote: `LT-${sufijo}`,
          id_sucursal: ids.id_sucursal,
          tipo_precio: 'venta',
          valor_anterior: null,
          valor_nuevo: '12.50',
          origen: 'ingreso_lote',
        }),
      ]));

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
