const ProductoService = require('../services/ProductoService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const producto = await ProductoService.crearProducto(req.body);
  return res.status(201).json(producto);
});

const obtenerTodos = asyncHandler(async (_req, res) => {
  const productos = await ProductoService.obtenerTodos();
  return res.status(200).json(productos);
});

const autocompletarParaPOS = asyncHandler(async (req, res) => {
  const productos = await ProductoService.autocompletarParaPOS({
    busqueda: req.query.busqueda,
    limite: req.query.limite,
    id_sucursal: req.usuario.id_sucursal,
  });
  return res.status(200).json(productos);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const producto = await ProductoService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(producto);
});

const actualizar = asyncHandler(async (req, res) => {
  const producto = await ProductoService.actualizarProducto(Number(req.params.id), req.body);
  return res.status(200).json(producto);
});

// PATCH /api/productos/:id/mayoreo — exclusivo para dependiente (interruptor POS)
const cambiarAplicaMayoreo = asyncHandler(async (req, res) => {
  const resultado = await ProductoService.cambiarAplicaMayoreo(
    Number(req.params.id),
    req.body.aplica_mayoreo,
  );
  return res.status(200).json(resultado);
});

// PATCH /api/productos/:id/estado — desactiva o reactiva
const cambiarEstado = asyncHandler(async (req, res) => {
  const resultado = req.body.activo
    ? await ProductoService.reactivarProducto(Number(req.params.id))
    : await ProductoService.desactivarProducto(Number(req.params.id));

  return res.status(200).json(resultado);
});

module.exports = {
  crear,
  obtenerTodos,
  autocompletarParaPOS,
  obtenerPorId,
  actualizar,
  cambiarAplicaMayoreo,
  cambiarEstado,
};
