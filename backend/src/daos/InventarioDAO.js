const pool = require('../database/db');

class InventarioDAO {
  async obtenerPorSucursal(id_sucursal) {
    const query = `
      WITH inventario_producto AS (
        SELECT
          p.id_producto,
          p.codigo,
          p.nombre_comercial,
          p.nombre_generico,
          p.concentracion,
          p.id_presentacion,
          p.id_categoria,
          p.id_casa,
          p.id_proveedor,
          p.precio_compra,
          p.stock_minimo,
          p.meses_alerta_vencimiento,
          p.aplica_mayoreo,
          p.activo,
          pre.nombre                         AS presentacion,
          c.nombre                           AS categoria_nombre,
          cf.nombre                          AS casa_nombre,
          pr.nombre                          AS proveedor_nombre,

          -- El inventario unificado debe incluir productos que aún no tienen lotes.
          COALESCE(SUM(v.stock_actual), 0)    AS stock_total,
          COUNT(v.id_lote)                   AS total_lotes,
          COUNT(v.id_lote) FILTER (
            WHERE v.stock_actual > 0
          )                                  AS lotes_con_existencias,

          -- Las alertas de vencimiento solo son operativas si queda producto.
          COUNT(v.id_lote) FILTER (
            WHERE v.estado_vencimiento = 'vencido'
              AND v.stock_actual > 0
          )                                  AS lotes_vencidos,
          COUNT(v.id_lote) FILTER (
            WHERE v.estado_vencimiento = 'proximo_a_vencer'
              AND v.stock_actual > 0
          )                                  AS lotes_proximos_vencer,

          COUNT(v.id_lote) FILTER (
            WHERE v.estado_stock = 'agotado'
          )                                  AS lotes_agotados,
          COUNT(v.id_lote) FILTER (
            WHERE v.estado_stock = 'poco_stock'
          )                                  AS lotes_poco_stock,

          -- El stock mínimo pertenece al producto, por lo que se compara con
          -- el total de la sucursal y no con cada lote por separado.
          CASE
            WHEN COUNT(v.id_lote) = 0
              THEN 'sin_lotes'
            WHEN COALESCE(SUM(v.stock_actual), 0) = 0
              THEN 'agotado'
            WHEN COALESCE(SUM(v.stock_actual), 0) <= p.stock_minimo
              THEN 'poco_stock'
            ELSE 'normal'
          END                                AS estado_stock,

          CASE
            WHEN COUNT(v.id_lote) = 0
              THEN 'sin_lotes'
            WHEN COUNT(v.id_lote) FILTER (
              WHERE v.estado_vencimiento = 'vencido'
                AND v.stock_actual > 0
            ) > 0
              THEN 'vencido'
            WHEN COUNT(v.id_lote) FILTER (
              WHERE v.estado_vencimiento = 'proximo_a_vencer'
                AND v.stock_actual > 0
            ) > 0
              THEN 'proximo_a_vencer'
            ELSE 'normal'
          END                                AS estado_vencimiento

        FROM producto p
        JOIN categoria         c   ON c.id_categoria     = p.id_categoria
        JOIN casa_farmaceutica cf  ON cf.id_casa          = p.id_casa
        JOIN presentacion      pre ON pre.id_presentacion = p.id_presentacion
        LEFT JOIN proveedor    pr  ON pr.id_proveedor     = p.id_proveedor
        LEFT JOIN v_lote_estado v  ON v.id_producto       = p.id_producto
                                  AND v.id_sucursal       = $1

        GROUP BY
          p.id_producto, p.codigo, p.nombre_comercial, p.nombre_generico,
          p.concentracion, p.id_presentacion, p.id_categoria, p.id_casa,
          p.id_proveedor, p.precio_compra, p.stock_minimo,
          p.meses_alerta_vencimiento, p.aplica_mayoreo, p.activo,
          pre.nombre, c.nombre, cf.nombre, pr.nombre
      )
      SELECT
        inventario_producto.*,
        -- Compatibilidad temporal con la pantalla anterior. La vista unificada
        -- consumirá estado_stock y estado_vencimiento de forma independiente.
        CASE
          WHEN estado_stock = 'sin_lotes' THEN 'sin_lotes'
          WHEN estado_vencimiento = 'vencido' THEN 'vencido'
          WHEN estado_stock = 'agotado' THEN 'agotado'
          WHEN estado_vencimiento = 'proximo_a_vencer' THEN 'proximo_a_vencer'
          WHEN estado_stock = 'poco_stock' THEN 'poco_stock'
          ELSE 'normal'
        END AS estado_consolidado
      FROM inventario_producto
      ORDER BY
        CASE
          WHEN estado_vencimiento = 'vencido' THEN 1
          WHEN estado_stock = 'agotado' THEN 2
          WHEN estado_vencimiento = 'proximo_a_vencer' THEN 3
          WHEN estado_stock = 'poco_stock' THEN 4
          WHEN estado_stock = 'sin_lotes' THEN 5
          ELSE 6
        END,
        nombre_comercial ASC
    `;

    const { rows } = await pool.query(query, [id_sucursal]);
    return rows;
  }

  async obtenerResumenPorSucursal(id_sucursal) {
    const query = `
      WITH estado_por_producto AS (
        SELECT
          p.id_producto,
          CASE
            WHEN COUNT(v.id_lote) = 0 THEN 'sin_lotes'
            WHEN COALESCE(SUM(v.stock_actual), 0) = 0 THEN 'agotado'
            WHEN COALESCE(SUM(v.stock_actual), 0) <= p.stock_minimo THEN 'poco_stock'
            ELSE 'normal'
          END AS estado_stock,
          CASE
            WHEN COUNT(v.id_lote) = 0 THEN 'sin_lotes'
            WHEN COUNT(v.id_lote) FILTER (
              WHERE v.estado_vencimiento = 'vencido'
                AND v.stock_actual > 0
            ) > 0 THEN 'vencido'
            WHEN COUNT(v.id_lote) FILTER (
              WHERE v.estado_vencimiento = 'proximo_a_vencer'
                AND v.stock_actual > 0
            ) > 0 THEN 'proximo_a_vencer'
            ELSE 'normal'
          END AS estado_vencimiento
        FROM producto p
        LEFT JOIN v_lote_estado v ON v.id_producto = p.id_producto
                                 AND v.id_sucursal = $1
        GROUP BY p.id_producto, p.stock_minimo
      )
      SELECT
        COUNT(*) AS total_productos,
        COUNT(*) FILTER (
          WHERE estado_stock = 'sin_lotes'
        ) AS productos_sin_lotes,
        COUNT(*) FILTER (
          WHERE estado_stock = 'agotado'
        ) AS productos_agotados,
        COUNT(*) FILTER (
          WHERE estado_stock = 'poco_stock'
        ) AS productos_poco_stock,
        COUNT(*) FILTER (
          WHERE estado_vencimiento = 'vencido'
        ) AS productos_vencidos,
        COUNT(*) FILTER (
          WHERE estado_vencimiento = 'proximo_a_vencer'
        ) AS productos_proximos_vencer,

        -- Campos temporales para las tarjetas de la pantalla anterior.
        COUNT(*) FILTER (
          WHERE estado_vencimiento = 'vencido'
             OR estado_stock = 'agotado'
        ) AS productos_criticos,
        COUNT(*) FILTER (
          WHERE estado_stock = 'normal'
            AND estado_vencimiento = 'normal'
        ) AS productos_optimos
      FROM estado_por_producto
    `;

    const { rows } = await pool.query(query, [id_sucursal]);
    return rows[0];
  }
}

module.exports = new InventarioDAO();
