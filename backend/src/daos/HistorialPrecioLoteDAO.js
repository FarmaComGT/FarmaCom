const pool = require('../database/db');

const CAMPOS_PRECIO = [
  { columna: 'precio_compra', tipo: 'compra' },
  { columna: 'precio_venta', tipo: 'venta' },
];

const normalizarPrecio = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    throw new TypeError('El precio debe tener un valor numérico');
  }

  const precio = Number(valor);
  if (!Number.isFinite(precio)) {
    throw new TypeError('El precio debe tener un valor numérico');
  }

  return precio.toFixed(2);
};

class HistorialPrecioLoteDAO {
  async registrarPorIngreso(loteAnterior, loteNuevo, id_usuario, client = pool) {
    const registros = [];

    for (const { columna, tipo } of CAMPOS_PRECIO) {
      const valorAnterior = loteAnterior === null
        ? null
        : normalizarPrecio(loteAnterior[columna]);
      const valorNuevo = normalizarPrecio(loteNuevo[columna]);

      if (valorAnterior === valorNuevo) continue;

      const { rows } = await client.query(
        `INSERT INTO historial_precio_lote (
           id_lote, tipo_precio, valor_anterior, valor_nuevo, origen, id_usuario
         )
         VALUES ($1, $2, $3, $4, 'ingreso_lote', $5)
         RETURNING *`,
        [loteNuevo.id_lote, tipo, valorAnterior, valorNuevo, id_usuario],
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
