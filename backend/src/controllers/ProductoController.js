const ProductoService = require('../services/ProductoService');
const asyncHandler = require('../middlewares/asyncHandler');

const buscarParaSeleccion = asyncHandler(async (req, res) => {
  res.json(await ProductoService.buscarParaSeleccion(req.query.busqueda, req.query.limite));
});

const seleccionarPorLectura = asyncHandler(async (req, res) => {
  res.json(await ProductoService.seleccionarPorLectura(req.query.codigo));
});

const buscarPorLectura = asyncHandler(async (req, res) => {
  const lotes = await ProductoService.buscarPorLectura({
    codigo: req.query.codigo,
    id_sucursal: req.usuario.id_sucursal,
  });
  return res.status(200).json(lotes);
});

const crear = asyncHandler(async (req, res) => {
  const producto = req.usuario
    ? await ProductoService.crearProducto(req.body, req.usuario)
    : await ProductoService.crearProducto(req.body);
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
  const producto = req.usuario
    ? await ProductoService.actualizarProducto(Number(req.params.id), req.body, req.usuario)
    : await ProductoService.actualizarProducto(Number(req.params.id), req.body);
  return res.status(200).json(producto);
});

// PATCH /api/productos/:id/mayoreo — exclusivo para dependiente (interruptor POS)
const cambiarAplicaMayoreo = asyncHandler(async (req, res) => {
  const resultado = req.usuario
    ? await ProductoService.cambiarAplicaMayoreo(
      Number(req.params.id), req.body.aplica_mayoreo, req.usuario,
    )
    : await ProductoService.cambiarAplicaMayoreo(
      Number(req.params.id), req.body.aplica_mayoreo,
    );
  return res.status(200).json(resultado);
});

// PATCH /api/productos/:id/estado — desactiva o reactiva
const cambiarEstado = asyncHandler(async (req, res) => {
  const metodo = req.body.activo ? 'reactivarProducto' : 'desactivarProducto';
  const resultado = req.usuario
    ? await ProductoService[metodo](Number(req.params.id), req.usuario)
    : await ProductoService[metodo](Number(req.params.id));

  return res.status(200).json(resultado);
});

module.exports = {
  seleccionarPorLectura,
  buscarParaSeleccion,
  buscarPorLectura,
  crear,
  obtenerTodos,
  autocompletarParaPOS,
  obtenerPorId,
  actualizar,
  cambiarAplicaMayoreo,
  cambiarEstado,
};
