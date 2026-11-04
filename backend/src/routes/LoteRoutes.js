const { Router } = require('express');
const { query } = require('express-validator');
const LoteController = require('../controllers/LoteController');
const HistorialPrecioLoteController = require('../controllers/HistorialPrecioLoteController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');
const {
  validarParamId,
  validarParamIdSucursal,
  validarParamIdProducto,
  validarCreacion,
  validarActualizacion,
  validarAjusteStock,
} = require('../validators/loteValidators');

const router = Router();

router.post('/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarCreacion,
  validateRequest,
  LoteController.crear,
);

// Debe declararse antes de /:id para que "alertas" no se interprete como un id.
router.get('/alertas',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  LoteController.obtenerAlertas,
);

router.get('/:id/historial-precios',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validateRequest,
  HistorialPrecioLoteController.obtenerPorLote,
);

router.get('/:id/movimientos',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validateRequest,
  LoteController.obtenerMovimientos,
);

router.patch('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarActualizacion,
  validateRequest,
  LoteController.actualizar,
);

router.patch('/:id/stock',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarAjusteStock,
  validateRequest,
  LoteController.ajustarStock,
);

router.delete('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validateRequest,
  LoteController.eliminar,
);

router.get('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validateRequest,
  LoteController.obtenerPorId,
);

router.get('/sucursal/:id_sucursal',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdSucursal,
  validateRequest,
  LoteController.obtenerPorSucursal,
);

router.get('/producto/:id_producto',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdProducto,
  query('pagina').optional().isString().bail()
    .isInt({ min: 1, max: 2147483647 }).withMessage('Página inválida').toInt(),
  query('limite').optional().isString().bail()
    .isInt({ min: 1, max: 100 }).withMessage('Límite inválido').toInt(),
  query('id_sucursal').optional().isString().bail().isInt({ min: 1, max: 2147483647 }).toInt(),
  query('estado_stock').optional().isString().bail().isIn(['normal', 'poco_stock', 'agotado']),
  query('estado_vencimiento').optional().isString().bail().isIn(['normal', 'proximo_a_vencer', 'vencido']),
  validateRequest,
  LoteController.obtenerPorProducto,
);

router.get('/sucursal/:id_sucursal/alertas',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamIdSucursal,
  validateRequest,
  LoteController.obtenerAlertas,
);

module.exports = router;
