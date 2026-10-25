const LoteService = require('../services/LoteService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const resultado = await LoteService.crearLote(req.body, req.usuario.id_usuario);
  return res.status(201).json(resultado);
});

const obtenerPorSucursal = asyncHandler(async (req, res) => {
  const lotes = await LoteService.obtenerPorSucursal(Number(req.params.id_sucursal));
  return res.status(200).json(lotes);
});

const obtenerPorProducto = asyncHandler(async (req, res) => {
  const lotes = await LoteService.obtenerPorProducto(Number(req.params.id_producto));
  return res.status(200).json(lotes);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const lote = await LoteService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(lote);
});

const actualizar = asyncHandler(async (req, res) => {
  const lote = await LoteService.actualizarLote(
    Number(req.params.id),
    req.body,
  );
  return res.status(200).json(lote);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await LoteService.eliminarLote(Number(req.params.id));
  return res.status(200).json(resultado);
});

const obtenerAlertas = asyncHandler(async (req, res) => {
  const id_sucursal = req.params.id_sucursal ? Number(req.params.id_sucursal) : null;
  const alertas = await LoteService.obtenerAlertas(id_sucursal);
  return res.status(200).json(alertas);
});

module.exports = {
  crear,
  obtenerPorSucursal,
  obtenerPorProducto,
  obtenerPorId,
  actualizar,
  eliminar,
  obtenerAlertas,
};
