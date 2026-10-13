const clienteService = require('../services/ClienteService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => (
  res.status(201).json(await clienteService.crearCliente(req.body))
));

const obtenerTodas = asyncHandler(async (_req, res) => (
  res.json(await clienteService.obtenerTodos())
));

const obtenerPorId = asyncHandler(async (req, res) => (
  res.json(await clienteService.obtenerPorId(Number(req.params.id)))
));

const actualizar = asyncHandler(async (req, res) => (
  res.json(await clienteService.actualizarCliente(Number(req.params.id), req.body))
));

const eliminar = asyncHandler(async (req, res) => (
  res.json(await clienteService.eliminarCliente(Number(req.params.id)))
));

module.exports = { crear, obtenerTodas, obtenerPorId, actualizar, eliminar };
