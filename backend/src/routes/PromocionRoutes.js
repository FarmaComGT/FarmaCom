const { Router } = require('express');
const { body, param } = require('express-validator');
const PromocionController = require('../controllers/PromocionController');
const verificarToken      = require('../middlewares/verificarToken');
const verificarRol        = require('../middlewares/verificarRol');
const validateRequest     = require('../middlewares/validateRequest');

const router = Router();
const rolesConsulta = verificarRol('dueno', 'administrador', 'dependiente');
const rolesAdministracion = verificarRol('dueno', 'administrador');

// ── validadores ───────────────────────────────────────────────────────────────

const validarParamId = [
  param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
    .toInt(),
];

const validarActualizacion = [
  body('cantidad_minima')
    .optional()
    .isInt({ min: 1 }).withMessage('La cantidad mínima debe ser mayor a 0')
    .toInt(),

  body('precio_promocion')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('El precio de promoción debe ser mayor a 0')
    .toFloat(),

  body('fecha_inicio')
    .optional()
    .isISO8601().withMessage('fecha_inicio debe ser una fecha válida (YYYY-MM-DD)')
    .toDate(),

  body('fecha_fin')
    .optional()
    .isISO8601().withMessage('fecha_fin debe ser una fecha válida (YYYY-MM-DD)')
    .toDate(),
];

const validarCambioEstado = [
  body('activo')
    .isBoolean().withMessage('El campo "activo" debe ser un booleano')
    .toBoolean(),
];

// ── rutas ─────────────────────────────────────────────────────────────────────

// GET    /api/promociones/:id
router.get('/:id',
  verificarToken,
  rolesConsulta,
  validarParamId,
  validateRequest,
  PromocionController.obtenerPorId,
);

// PUT    /api/promociones/:id
router.put('/:id',
  verificarToken,
  rolesAdministracion,
  validarParamId,
  validarActualizacion,
  validateRequest,
  PromocionController.actualizar,
);

// PATCH  /api/promociones/:id/estado
router.patch('/:id/estado',
  verificarToken,
  rolesAdministracion,
  validarParamId,
  validarCambioEstado,
  validateRequest,
  PromocionController.cambiarEstado,
);

// DELETE /api/promociones/:id — borrado físico
router.delete('/:id',
  verificarToken,
  rolesAdministracion,
  validarParamId,
  validateRequest,
  PromocionController.eliminar,
);

module.exports = router;
