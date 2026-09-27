const pool = require('../database/db');

class ProductoDAO {

  async crear({ codigo, nombre_comercial, nombre_generico, concentracion, id_presentacion, descripcion, id_categoria, id_casa, id_proveedor, precio_compra, stock_minimo, meses_alerta_vencimiento, aplica_mayoreo }) {
    const query = `
      INSERT INTO producto (
        codigo, nombre_comercial, nombre_generico, concentracion, id_presentacion, descripcion,
        id_categoria, id_casa, id_proveedor,
        precio_compra, stock_minimo, meses_alerta_vencimiento, aplica_mayoreo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const valores = [
      codigo,
      nombre_comercial,
      nombre_generico,
      concentracion                ?? null,
      id_presentacion,
      descripcion                  ?? null,
      id_categoria,
      id_casa,
      id_proveedor                 ?? null,
      precio_compra,
      stock_minimo                 ?? 5,
      meses_alerta_vencimiento,
      aplica_mayoreo               ?? false,
    ];
    
    const { rows } = await pool.query(query, valores);
    return rows[0];
  }

  async obtenerTodos() {
    const query = `
      SELECT
        p.*,
        pre.nombre AS presentacion,
        c.nombre   AS categoria_nombre,
        cf.nombre  AS casa_nombre,
        pr.nombre  AS proveedor_nombre
      FROM producto p
      JOIN presentacion      pre ON pre.id_presentacion = p.id_presentacion
      JOIN categoria         c  ON c.id_categoria  = p.id_categoria
      JOIN casa_farmaceutica cf ON cf.id_casa       = p.id_casa
      LEFT JOIN proveedor    pr ON pr.id_proveedor  = p.id_proveedor
      ORDER BY p.id_producto
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  async autocompletarParaPOS(busqueda, id_sucursal, limite) {
    const query = `
      WITH termino AS (
        SELECT normalizar_texto_busqueda($1) AS valor
      ),
      productos_coincidentes AS (
        SELECT
          p.id_producto,
          p.codigo,
          p.nombre_comercial,
          p.nombre_generico,
          p.concentracion,
          p.aplica_mayoreo,
          pre.nombre AS presentacion,
          normalizar_texto_busqueda(p.codigo) AS codigo_normalizado,
          normalizar_texto_busqueda(p.nombre_comercial) AS nombre_comercial_normalizado,
          normalizar_texto_busqueda(p.nombre_generico) AS nombre_generico_normalizado,
          normalizar_texto_busqueda(CONCAT_WS(' ', p.codigo, p.nombre_comercial,
            p.nombre_generico, p.concentracion, pre.nombre)) AS texto_busqueda
        FROM producto p
        JOIN presentacion pre ON pre.id_presentacion = p.id_presentacion
        WHERE p.activo = TRUE
      ),
      productos_con_relevancia AS (
        SELECT
          p.*,
          CASE
            WHEN p.codigo_normalizado = t.valor THEN 0
            WHEN p.codigo_normalizado LIKE t.valor || '%' THEN 1
            WHEN p.nombre_comercial_normalizado LIKE t.valor || '%' THEN 2
            WHEN p.nombre_generico_normalizado LIKE t.valor || '%' THEN 3
            ELSE 4
          END AS prioridad,
          GREATEST(
            similarity(p.codigo_normalizado, t.valor),
            similarity(p.nombre_comercial_normalizado, t.valor),
            similarity(p.nombre_generico_normalizado, t.valor)
          ) AS relevancia,
          CASE
            WHEN p.texto_busqueda LIKE '%' || t.valor || '%' THEN 'exacta'
            ELSE 'aproximada'
          END AS tipo_coincidencia,
          t.valor AS termino_normalizado
        FROM productos_coincidentes p
        CROSS JOIN termino t
        WHERE t.valor <> ''
          AND EXISTS (
            SELECT 1
            FROM lote l
            WHERE l.id_producto = p.id_producto
              AND l.id_sucursal = $2
              AND l.stock_actual > 0
              AND l.precio_venta > 0
              AND l.fecha_vencimiento >= CURRENT_DATE
          )
      ),
      productos_limitados AS (
        SELECT *
        FROM productos_con_relevancia
        WHERE texto_busqueda LIKE '%' || termino_normalizado || '%'
          OR (
            char_length(termino_normalizado) >= 3
            AND (
              codigo_normalizado % termino_normalizado
              OR nombre_comercial_normalizado % termino_normalizado
              OR nombre_generico_normalizado % termino_normalizado
            )
            AND relevancia >= 0.30
          )
        ORDER BY prioridad, relevancia DESC, nombre_comercial ASC, id_producto ASC
        LIMIT $3
      )
      SELECT
        p.id_producto,
        lote_pos.id_lote,
        p.codigo,
        p.nombre_comercial,
        p.nombre_generico,
        p.concentracion,
        p.presentacion,
        lote_pos.numero_lote,
        lote_pos.fecha_vencimiento,
        lote_pos.stock_actual AS stock_disponible,
        lote_pos.precio_venta,
        lote_pos.estado_stock,
        lote_pos.estado_vencimiento,
        p.aplica_mayoreo,
        lote_pos.precio_mayoreo,
        lote_pos.cantidad_mayoreo,
        p.relevancia,
        p.tipo_coincidencia
      FROM productos_limitados p
      JOIN v_lote_estado lote_pos
        ON lote_pos.id_producto = p.id_producto
       AND lote_pos.id_sucursal = $2
       AND lote_pos.stock_actual > 0
       AND lote_pos.precio_venta > 0
       AND lote_pos.fecha_vencimiento >= CURRENT_DATE
      ORDER BY
        p.prioridad,
        p.relevancia DESC,
        p.nombre_comercial ASC,
        p.id_producto ASC,
        lote_pos.fecha_vencimiento ASC,
        lote_pos.id_lote ASC
    `;
    const { rows } = await pool.query(query, [busqueda, id_sucursal, limite]);
    return rows;
  }

  async obtenerPorId(id_producto) {
    const query = `
      SELECT
        p.*,
        pre.nombre AS presentacion,
        c.nombre   AS categoria_nombre,
        cf.nombre  AS casa_nombre,
        pr.nombre  AS proveedor_nombre
      FROM producto p
      JOIN presentacion      pre ON pre.id_presentacion = p.id_presentacion
      JOIN categoria         c  ON c.id_categoria  = p.id_categoria
      JOIN casa_farmaceutica cf ON cf.id_casa       = p.id_casa
      LEFT JOIN proveedor    pr ON pr.id_proveedor  = p.id_proveedor
      WHERE p.id_producto = $1
    `;
    const { rows } = await pool.query(query, [id_producto]);
    return rows[0] || null;
  }

  async obtenerPorCodigo(codigo) {
    const { rows } = await pool.query(
      `SELECT * FROM producto WHERE LOWER(codigo) = LOWER($1)`,
      [codigo],
    );
    return rows[0] || null;
  }

   async obtenerPorIdentidad({ nombre_generico, concentracion, id_casa, id_presentacion }) {
    const query = `
      SELECT *
      FROM producto
      WHERE LOWER(TRIM(nombre_generico)) = LOWER(TRIM($1))
        AND COALESCE(LOWER(TRIM(concentracion)), '')
            = COALESCE(LOWER(TRIM($2)), '')
        AND id_casa                      = $3
        AND id_presentacion              = $4
    `;
    const { rows } = await pool.query(query, [nombre_generico, concentracion, id_casa, id_presentacion]);
    return rows[0] || null;
  }

  async actualizar(id_producto, campos) {
    const {
      codigo, nombre_comercial, nombre_generico, concentracion, id_presentacion, descripcion,
      id_categoria, id_casa, id_proveedor,
      precio_compra, stock_minimo, meses_alerta_vencimiento, aplica_mayoreo,
    } = campos;
    const actualizaConcentracion = Object.prototype.hasOwnProperty.call(campos, 'concentracion');

    const query = `
      UPDATE producto SET
        codigo                   = COALESCE($1,  codigo),
        nombre_comercial         = COALESCE($2,  nombre_comercial),
        nombre_generico          = COALESCE($3,  nombre_generico),
        concentracion            = CASE WHEN $14 THEN $4 ELSE concentracion END,
        id_presentacion          = COALESCE($5,  id_presentacion),
        descripcion              = COALESCE($6,  descripcion),
        id_categoria             = COALESCE($7,  id_categoria),
        id_casa                  = COALESCE($8,  id_casa),
        id_proveedor             = COALESCE($9,  id_proveedor),
        precio_compra            = COALESCE($10, precio_compra),
        stock_minimo             = COALESCE($11, stock_minimo),
        meses_alerta_vencimiento = COALESCE($12, meses_alerta_vencimiento),
        aplica_mayoreo           = COALESCE($13, aplica_mayoreo)
      WHERE id_producto = $15
      RETURNING *
    `;
    const valores = [
      codigo                   ?? null,
      nombre_comercial         ?? null,
      nombre_generico          ?? null,
      concentracion            ?? null,
      id_presentacion          ?? null,
      descripcion              ?? null,
      id_categoria             ?? null,
      id_casa                  ?? null,
      id_proveedor             ?? null,
      precio_compra            ?? null,
      stock_minimo             ?? null,
      meses_alerta_vencimiento ?? null,
      aplica_mayoreo           ?? null,
      actualizaConcentracion,
      id_producto,
    ];

    const { rows } = await pool.query(query, valores);
    return rows[0] || null;
  }

  // Solo el dependiente puede togglear este campo
  async cambiarAplicaMayoreo(id_producto, aplica_mayoreo) {
    const { rows } = await pool.query(
      `UPDATE producto SET aplica_mayoreo = $1 WHERE id_producto = $2 RETURNING *`,
      [aplica_mayoreo, id_producto],
    );
    return rows[0] || null;
  }

  async cambiarActivo(id_producto, activo) {
    const { rows } = await pool.query(
      `UPDATE producto SET activo = $1 WHERE id_producto = $2 RETURNING *`,
      [activo, id_producto],
    );
    return rows[0] || null;
  }
}

module.exports = new ProductoDAO();
