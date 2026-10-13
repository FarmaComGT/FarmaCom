const ProveedorEmailService = require('../services/ProveedorEmailService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const id_proveedor = Number(req.params.id_proveedor);
  const { correo } = req.body;
  const email = await ProveedorEmailService.crearEmail({ id_proveedor, correo });
  return res.status(201).json(email);
});

const obtenerPorProveedor = asyncHandler(async (req, res) => {
  const id_proveedor = Number(req.params.id_proveedor);
  const emails = await ProveedorEmailService.obtenerPorProveedor(id_proveedor);
  return res.status(200).json(emails);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const email = await ProveedorEmailService.obtenerPorId(Number(req.params.id_email));
  return res.status(200).json(email);
});

const actualizar = asyncHandler(async (req, res) => {
  const email = await ProveedorEmailService.actualizarEmail(Number(req.params.id_email), req.body);
  return res.status(200).json(email);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await ProveedorEmailService.eliminarEmail(Number(req.params.id_email));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorProveedor, obtenerPorId, actualizar, eliminar };
