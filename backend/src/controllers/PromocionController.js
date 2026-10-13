const PromocionService = require('../services/PromocionService');
const AppError = require('../errors/AppError');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const id_producto = Number(req.params.id_producto);
  const promocion = await PromocionService.crearPromocion(id_producto, req.body);
  return res.status(201).json(promocion);
});

const obtenerPorProducto = asyncHandler(async (req, res) => {
  const promociones = await PromocionService.obtenerPorProducto(
    Number(req.params.id_producto),
  );
  return res.status(200).json(promociones);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const promocion = await PromocionService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(promocion);
});

const actualizar = asyncHandler(async (req, res) => {
  const promocion = await PromocionService.actualizarPromocion(Number(req.params.id), req.body);
  return res.status(200).json(promocion);
});

// PATCH /api/promociones/:id/estado — cancelación manual antes de fecha_fin
const cambiarEstado = asyncHandler(async (req, res) => {
  const { activo } = req.body;

  // Solo se puede desactivar desde este endpoint (la activación es al crear)
  if (activo === true) {
    throw new AppError('Para activar una promoción, créela nuevamente', 400);
  }

  const resultado = await PromocionService.desactivarPromocion(Number(req.params.id));
  return res.status(200).json(resultado);
});

// DELETE /api/promociones/:id — borrado físico
const eliminar = asyncHandler(async (req, res) => {
  const resultado = await PromocionService.eliminarPromocion(Number(req.params.id));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorProducto, obtenerPorId, actualizar, cambiarEstado, eliminar };
