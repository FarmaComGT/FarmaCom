const HistorialInventarioService = require('../services/HistorialInventarioService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtener = asyncHandler(async (req, res) => {
  const resultado = await HistorialInventarioService.obtenerHistorial({
    id_producto: req.query.id_producto,
    lote: req.query.lote,
    id_sucursal: req.query.id_sucursal,
    fecha_desde: req.query.fecha_desde,
    fecha_hasta: req.query.fecha_hasta,
    usuario: req.query.usuario,
    tipo_cambio: req.query.tipo_cambio,
    pagina: req.query.pagina,
    limite: req.query.limite,
  }, req.usuario);
  return res.status(200).json(resultado);
});

module.exports = { obtener };
