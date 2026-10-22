const VentaService = require('../services/VentaService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const venta = await VentaService.crearVenta(req.body, req.usuario);
  return res.status(201).json(venta);
});

const crearPagoPOS = asyncHandler(async (req, res) => {
  const pago = await VentaService.crearPagoPOS(req.body, req.usuario);
  return res.status(201).json(pago);
});

const obtenerEstadoPagoPOS = asyncHandler(async (req, res) => {
  const pago = await VentaService.obtenerEstadoPagoPOS(
    req.params.externalId,
    req.usuario,
  );
  return res.status(200).json(pago);
});

const obtenerTodas = asyncHandler(async (req, res) => {
  const ventas = await VentaService.obtenerTodas(req.query, req.usuario);
  return res.status(200).json(ventas);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const venta = await VentaService.obtenerPorId(
    Number(req.params.id),
    req.usuario,
  );
  return res.status(200).json(venta);
});

const asociarCliente = asyncHandler(async (req, res) => {
  const venta = await VentaService.asociarCliente(
    Number(req.params.id),
    req.body.id_cliente,
    req.usuario,
  );
  return res.status(200).json(venta);
});

const anular = asyncHandler(async (req, res) => {
  const venta = await VentaService.anularVenta(
    Number(req.params.id),
    req.body.motivo_anulacion,
    req.usuario,
  );
  return res.status(200).json(venta);
});

module.exports = {
  crear,
  crearPagoPOS,
  obtenerEstadoPagoPOS,
  obtenerTodas,
  obtenerPorId,
  asociarCliente,
  anular,
};
