const { Router } = require('express');
const { query } = require('express-validator');
const ProductoController = require('../controllers/ProductoController');
const PromocionController = require('../controllers/PromocionController');
const HistorialPrecioLoteController = require('../controllers/HistorialPrecioLoteController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');
const {
  validarParamId,
  validarParamIdProducto,
  validarCreacionProducto,
  validarActualizacionProducto,
  validarCambioEstado,
  validarCambioMayoreo,
  validarAutocompletado,
  validarLectura,
  validarCreacionPromocion,
} = require('../validators/productoValidators');
const { validarPaginacion } = require('../validators/paginacionValidators');

const router = Router();
const rolesConsultaPromociones = verificarRol('dueno', 'administrador', 'dependiente');
const rolesAdministracionPromociones = verificarRol('dueno', 'administrador');

// Antes de /:id. La sucursal siempre procede de la sesión autenticada.
router.get('/lectura',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarLectura,
  validateRequest,
  ProductoController.buscarPorLectura,
);

router.get('/',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  ProductoController.obtenerTodos,
);

// Debe declararse antes de /:id para evitar que Express interprete la ruta como un id.
router.get('/autocompletar',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarAutocompletado,
  validateRequest,
  ProductoController.autocompletarParaPOS,
);

router.get('/:id/historial-precios',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validateRequest,
  HistorialPrecioLoteController.obtenerPorProducto,
);

router.get('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validateRequest,
  ProductoController.obtenerPorId,
);

router.post('/',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarCreacionProducto,
  validateRequest,
  ProductoController.crear,
);

router.put('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validarActualizacionProducto,
  validateRequest,
  ProductoController.actualizar,
);

router.patch('/:id/mayoreo',
  verificarToken,
  verificarRol('dependiente'),
  validarParamId,
  validarCambioMayoreo,
  validateRequest,
  ProductoController.cambiarAplicaMayoreo,
);

router.patch('/:id/estado',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validarCambioEstado,
  validateRequest,
  ProductoController.cambiarEstado,
);

router.post('/:id_producto/promociones',
  verificarToken,
  rolesAdministracionPromociones,
  validarParamIdProducto,
  validarCreacionPromocion,
  validateRequest,
  PromocionController.crear,
);

router.get('/:id_producto/promociones',
  verificarToken,
  rolesConsultaPromociones,
  validarParamIdProducto,
  validarPaginacion,
  query('id_sucursal').optional().isString().bail()
    .isInt({ min: 1, max: 2147483647 }).withMessage('id_sucursal inválido').toInt(),
  validateRequest,
  PromocionController.obtenerPorProducto,
);

module.exports = router;
