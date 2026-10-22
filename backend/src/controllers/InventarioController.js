const InventarioService = require('../services/InventarioService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtenerInventario = asyncHandler(async (req, res) => {
  const productos = await InventarioService.obtenerInventarioPorSucursal(
    Number(req.params.id_sucursal),
  );
  return res.status(200).json(productos);
});

const obtenerResumen = asyncHandler(async (req, res) => {
  const resumen = await InventarioService.obtenerResumenPorSucursal(
    Number(req.params.id_sucursal),
  );
  return res.status(200).json(resumen);
});

module.exports = { obtenerInventario, obtenerResumen };
