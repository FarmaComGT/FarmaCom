const ProveedorService = require('../services/ProveedorService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const proveedor = await ProveedorService.crearProveedor(req.body);
  return res.status(201).json(proveedor);
});

const obtenerTodos = asyncHandler(async (_req, res) => {
  const proveedores = await ProveedorService.obtenerTodos();
  return res.status(200).json(proveedores);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const proveedor = await ProveedorService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(proveedor);
});

const actualizar = asyncHandler(async (req, res) => {
  const proveedor = await ProveedorService.actualizarProveedor(Number(req.params.id), req.body);
  return res.status(200).json(proveedor);
});

// PATCH /api/proveedores/:id/estado — activa o desactiva (baja lógica)
const cambiarEstado = asyncHandler(async (req, res) => {
  const { activo } = req.body;

  const resultado = await ProveedorService.cambiarEstado(Number(req.params.id), activo);
  return res.status(200).json(resultado);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await ProveedorService.eliminarProveedor(Number(req.params.id));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerTodos, obtenerPorId, actualizar, cambiarEstado, eliminar };
