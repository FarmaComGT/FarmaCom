const { Router } = require('express');
const { body, param } = require('express-validator');
const CasaFarmaceuticaController = require('../controllers/CasaFarmaceuticaController');
const CasaTelefonoController = require('../controllers/CasaTelefonoController');
const CasaEmailController = require('../controllers/CasaEmailController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const pool = require('../database/db');

const router = Router();

// Validadores

const validarParamId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarCreacion = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('nombre es requerido')
    .isLength({ max: 150 }).withMessage('nombre no puede superar los 150 caracteres'),
];

const validarActualizacion = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('nombre no puede estar vacío')
    .isLength({ max: 150 }).withMessage('nombre no puede superar los 150 caracteres'),
];

const validarTelefonoCreacion = [
  body('numero')
    .notEmpty().withMessage('El número es requerido')
    .isLength({ max: 20 }).withMessage('El número no puede superar los 20 caracteres'),
];

const validarTelefonoActualizacion = [
  body('numero')
    .optional()
    .notEmpty().withMessage('El número no puede estar vacío')
    .isLength({ max: 20 }).withMessage('El número no puede superar los 20 caracteres'),
];

const validarEmailCreacion = [
  body('correo')
    .notEmpty().withMessage('El correo es requerido')
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

const validarEmailActualizacion = [
  body('correo')
    .optional()
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

// Rutas: CasaFarmaceutica

// GET    /api/casas
router.get('/', verificarToken, CasaFarmaceuticaController.obtenerTodas);

// GET    /api/casas/:id
router.get('/:id', verificarToken, validarParamId, CasaFarmaceuticaController.obtenerPorId);

// POST   /api/casas
router.post(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarCreacion,
  CasaFarmaceuticaController.crear,
);

// PUT    /api/casas/:id
router.put(
  '/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarActualizacion,
  CasaFarmaceuticaController.actualizar,
);

// PATCH  /api/casas/:id/estado
router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  CasaFarmaceuticaController.cambiarEstado,
);

// DELETE /api/casas/:id
router.delete(
  '/:id',
  verificarToken,
  verificarRol('dueno'),
  validarParamId,
  CasaFarmaceuticaController.eliminar,
);

// GET  /api/casas/:id/proveedores
// Devuelve la lista de proveedores vinculados a la casa (tabla casa_proveedor)
router.get(
  '/:id/proveedores',
  verificarToken,
  validarParamId,
  async (req, res) => {
    try {
      const id_casa = Number(req.params.id);
 
      // Verificar que la casa exista
      const { rows: casaRows } = await pool.query(
        'SELECT id_casa FROM casa_farmaceutica WHERE id_casa = $1',
        [id_casa],
      );
      if (casaRows.length === 0) {
        return res.status(404).json({ mensaje: 'Casa farmacéutica no encontrada' });
      }
 
      // Obtener proveedores vinculados con su estado
      const { rows } = await pool.query(
        `SELECT p.id_proveedor, p.nombre, p.activo
         FROM proveedor p
         JOIN casa_proveedor cp ON cp.id_proveedor = p.id_proveedor
         WHERE cp.id_casa = $1
         ORDER BY p.nombre ASC`,
        [id_casa],
      );
 
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ mensaje: error.message });
    }
  },
);

// Rutas anidadas: Teléfonos

// GET    /api/casas/:id_casa/telefonos
router.get('/:id_casa/telefonos', verificarToken, CasaTelefonoController.obtenerPorCasa);

// POST   /api/casas/:id_casa/telefonos
router.post(
  '/:id_casa/telefonos',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarTelefonoCreacion,
  CasaTelefonoController.crear,
);

// PUT    /api/casas/:id_casa/telefonos/:id_telefono
router.put(
  '/:id_casa/telefonos/:id_telefono',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarTelefonoActualizacion,
  CasaTelefonoController.actualizar,
);

// DELETE /api/casas/:id_casa/telefonos/:id_telefono
router.delete(
  '/:id_casa/telefonos/:id_telefono',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  CasaTelefonoController.eliminar,
);

// Rutas anidadas: Correos

// GET    /api/casas/:id_casa/correos
router.get('/:id_casa/correos', verificarToken, CasaEmailController.obtenerPorCasa);

// POST   /api/casas/:id_casa/correos
router.post(
  '/:id_casa/correos',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarEmailCreacion,
  CasaEmailController.crear,
);

// PUT    /api/casas/:id_casa/correos/:id_email
router.put(
  '/:id_casa/correos/:id_email',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarEmailActualizacion,
  CasaEmailController.actualizar,
);

// DELETE /api/casas/:id_casa/correos/:id_email
router.delete(
  '/:id_casa/correos/:id_email',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  CasaEmailController.eliminar,
);


module.exports = router;