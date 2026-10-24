const { Router } = require('express');
const ProductoController = require('../controllers/ProductoController');
const PromocionController = require('../controllers/PromocionController');
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
  validarCreacionPromocion,
} = require('../validators/productoValidators');

const router = Router();
const rolesConsultaPromociones = verificarRol('dueno', 'administrador', 'dependiente');
const rolesAdministracionPromociones = verificarRol('dueno', 'administrador');

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
  validateRequest,
  PromocionController.obtenerPorProducto,
);

module.exports = router;
