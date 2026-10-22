const { Router } = require('express');
const { param } = require('express-validator');
const InventarioController = require('../controllers/InventarioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol   = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router({ mergeParams: true }); // mergeParams para heredar :id_sucursal

const validarParamIdSucursal = [
  param('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
];

// GET /api/sucursales/:id_sucursal/inventario
router.get(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdSucursal,
  validateRequest,
  InventarioController.obtenerInventario,
);

// GET /api/sucursales/:id_sucursal/inventario/resumen
router.get(
  '/resumen',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdSucursal,
  validateRequest,
  InventarioController.obtenerResumen,
);

module.exports = router;
