const pool = require('../database/db');
const { ejecutarConsultaPaginada } = require('../utils/paginacion');

class BitacoraInventarioDAO {
  async registrar({
    entidad,
    id_entidad,
    accion,
    id_producto = null,
    id_lote = null,
    id_sucursal = null,
    id_usuario,
    anterior = null,
    nuevo = null,
  }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO bitacora_inventario (
         entidad, id_entidad, accion, id_producto, id_lote, id_sucursal,
         id_usuario, valores_anteriores, valores_nuevos
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        entidad,
        id_entidad,
        accion,
        id_producto,
        id_lote,
        id_sucursal,
        id_usuario,
        anterior,
        nuevo,
      ],
    );
    return rows[0];
  }

  async obtenerHistorial({
    id_producto = null,
    lote = null,
    id_sucursal = null,
    fecha_desde = null,
    fecha_hasta = null,
    usuario = null,
    tipo_cambio = null,
    pagina = 1,
    limite = 25,
  }) {
    const patronLote = lote ? `%${lote}%` : null;
    const patronUsuario = usuario ? `%${usuario}%` : null;
    return ejecutarConsultaPaginada({
      cliente: pool,
      consultaBase: `WITH eventos AS (
         SELECT
           CONCAT('auditoria-', bi.id_bitacora) AS id_evento,
           bi.fecha_hora AS fecha,
           bi.accion AS tipo_cambio,
           bi.entidad,
           bi.id_producto,
           bi.id_lote,
           bi.id_sucursal,
           bi.id_usuario,
           u.nombre_usuario,
           COALESCE(s.nombre_sucursal, 'Todas las sucursales') AS nombre_sucursal,
           COALESCE(
             bi.valores_nuevos ->> 'nombre_comercial',
             bi.valores_anteriores ->> 'nombre_comercial',
             p.nombre_comercial
           ) AS nombre_producto,
           COALESCE(
             bi.valores_nuevos ->> 'numero_lote',
             bi.valores_anteriores ->> 'numero_lote',
             l.numero_lote
           ) AS numero_lote,
           bi.valores_anteriores,
           bi.valores_nuevos,
           NULL::VARCHAR(500) AS motivo,
           NULL::VARCHAR(150) AS referencia
         FROM bitacora_inventario bi
         JOIN usuario u ON u.id_usuario = bi.id_usuario
         LEFT JOIN sucursal s ON s.id_sucursal = bi.id_sucursal
         LEFT JOIN producto p ON p.id_producto = bi.id_producto
         LEFT JOIN lote l ON l.id_lote = bi.id_lote

         UNION ALL

         SELECT
           CONCAT('movimiento-', mi.id_movimiento) AS id_evento,
           mi.fecha_movimiento AS fecha,
           mi.tipo AS tipo_cambio,
           'stock'::VARCHAR(20) AS entidad,
           l.id_producto,
           mi.id_lote,
           mi.id_sucursal,
           mi.id_usuario,
           u.nombre_usuario,
           s.nombre_sucursal,
           p.nombre_comercial AS nombre_producto,
           l.numero_lote,
           jsonb_build_object('stock_actual', mi.cantidad_anterior) AS valores_anteriores,
           jsonb_build_object('stock_actual', mi.cantidad_nueva) AS valores_nuevos,
           mi.motivo,
           mi.referencia
         FROM movimiento_inventario mi
         JOIN lote l ON l.id_lote = mi.id_lote
         JOIN producto p ON p.id_producto = l.id_producto
         JOIN usuario u ON u.id_usuario = mi.id_usuario
         JOIN sucursal s ON s.id_sucursal = mi.id_sucursal
       ), filtrados AS (
         SELECT *
         FROM eventos e
         WHERE ($1::INTEGER IS NULL OR e.id_producto = $1)
           AND ($2::TEXT IS NULL OR e.numero_lote ILIKE $2 OR e.id_lote::TEXT = $3)
           AND ($4::INTEGER IS NULL OR e.id_sucursal = $4)
           AND ($5::DATE IS NULL OR e.fecha >= $5::DATE)
           AND ($6::DATE IS NULL OR e.fecha < ($6::DATE + INTERVAL '1 day'))
           AND ($7::TEXT IS NULL OR e.nombre_usuario ILIKE $7)
           AND ($8::TEXT IS NULL OR e.tipo_cambio = $8)
       )
       SELECT *
       FROM filtrados`,
      valores: [
        id_producto,
        patronLote,
        lote,
        id_sucursal,
        fecha_desde,
        fecha_hasta,
        patronUsuario,
        tipo_cambio,
      ],
      orden: 'ORDER BY fecha DESC, id_evento DESC',
      pagina,
      limite,
    });
  }
}

module.exports = new BitacoraInventarioDAO();
