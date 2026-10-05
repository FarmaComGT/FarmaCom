const pool = require('../database/db');

class HistorialPrecioLoteDAO {
  async registrarCambios(id_lote, id_usuario, loteAnterior, loteNuevo, client = pool) {
    const campos = [
      { columna: 'precio_compra', tipo: 'compra' },
      { columna: 'precio_venta', tipo: 'venta' },
    ];
    const registros = [];

    for (const { columna, tipo } of campos) {
      const valorAnterior = Number(loteAnterior[columna]);
      const valorNuevo = Number(loteNuevo[columna]);

      if (valorAnterior === valorNuevo) continue;

      const { rows } = await client.query(
        `INSERT INTO historial_precio_lote (
           id_lote, tipo_precio, valor_anterior, valor_nuevo, id_usuario
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id_lote, tipo, valorAnterior, valorNuevo, id_usuario],
      );
      registros.push(rows[0]);
    }

    return registros;
  }

  async obtenerPorLote(id_lote) {
    const { rows } = await pool.query(
      `SELECT
         h.id_historial_precio,
         h.id_lote,
         h.tipo_precio,
         h.valor_anterior,
         h.valor_nuevo,
         h.id_usuario,
         u.nombre_usuario,
         h.fecha_cambio
       FROM historial_precio_lote h
       JOIN usuario u ON u.id_usuario = h.id_usuario
       WHERE h.id_lote = $1
       ORDER BY h.fecha_cambio DESC, h.id_historial_precio DESC`,
      [id_lote],
    );
    return rows;
  }
}

module.exports = new HistorialPrecioLoteDAO();
