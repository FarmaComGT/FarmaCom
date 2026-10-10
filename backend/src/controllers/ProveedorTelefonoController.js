const ProveedorTelefonoService = require('../services/ProveedorTelefonoService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const id_proveedor = Number(req.params.id_proveedor);
  const { numero } = req.body;
  const telefono = await ProveedorTelefonoService.crearTelefono({ id_proveedor, numero });
  return res.status(201).json(telefono);
});

const obtenerPorProveedor = asyncHandler(async (req, res) => {
  const id_proveedor = Number(req.params.id_proveedor);
  const telefonos = await ProveedorTelefonoService.obtenerPorProveedor(id_proveedor);
  return res.status(200).json(telefonos);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const telefono = await ProveedorTelefonoService.obtenerPorId(Number(req.params.id_telefono));
  return res.status(200).json(telefono);
});

const actualizar = asyncHandler(async (req, res) => {
  const telefono = await ProveedorTelefonoService.actualizarTelefono(
    Number(req.params.id_telefono),
    req.body,
  );
  return res.status(200).json(telefono);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await ProveedorTelefonoService.eliminarTelefono(Number(req.params.id_telefono));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorProveedor, obtenerPorId, actualizar, eliminar };
