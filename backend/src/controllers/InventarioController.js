const InventarioService = require('../services/InventarioService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtenerInventario = asyncHandler(async (req, res) => {
  const consulta = req.query || {};
  const filtros = Object.fromEntries(
    ['pagina', 'limite', 'busqueda', 'id_categoria', 'activo', 'estado_stock', 'estado_vencimiento']
      .filter((campo) => consulta[campo] !== undefined)
      .map((campo) => [campo, consulta[campo]]),
  );
  const productos = await InventarioService.obtenerInventarioPorSucursal(
    Number(req.params.id_sucursal),
    req.usuario,
    ...(consulta.pagina !== undefined ? [{ ...filtros, limite: filtros.limite ?? 25 }] : []),
  );
  return res.status(200).json(productos);
});

const obtenerResumen = asyncHandler(async (req, res) => {
  const resumen = await InventarioService.obtenerResumenPorSucursal(
    Number(req.params.id_sucursal),
    req.usuario,
  );
  return res.status(200).json(resumen);
});

module.exports = { obtenerInventario, obtenerResumen };
