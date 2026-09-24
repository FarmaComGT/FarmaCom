const { Router } = require('express');
const { body, param, query } = require('express-validator');
const PacienteController = require('../controllers/PacienteController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();
const rolesPaciente = verificarRol('dueno', 'administrador', 'laboratorista');

const validarId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarDpi = body('dpi')
  .optional({ nullable: true })
  .customSanitizer((valor) => {
    if (typeof valor !== 'string') return valor;
    const normalizado = valor.trim().replace(/\s+/g, '');
    return normalizado || null;
  })
  .isLength({ max: 20 }).withMessage('dpi no puede superar los 20 caracteres');

const validarTelefono = body('telefono')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 20 }).withMessage('telefono no puede superar los 20 caracteres');

const validarFechaNacimiento = body('fecha_nacimiento')
  .optional({ nullable: true })
  .isISO8601({ strict: true }).withMessage('fecha_nacimiento debe tener formato YYYY-MM-DD');

const validarDireccion = body('direccion')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 500 }).withMessage('direccion no puede superar los 500 caracteres');

const validarObservaciones = body('observaciones')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 2000 }).withMessage('observaciones no puede superar los 2000 caracteres');

const validarRegistro = [
  body('id_laboratorio')
    .isInt({ min: 1 }).withMessage('id_laboratorio debe ser un entero positivo')
    .toInt(),
  body('nombre_paciente')
    .trim()
    .notEmpty().withMessage('nombre_paciente es requerido')
    .isLength({ max: 150 }).withMessage('nombre_paciente no puede superar los 150 caracteres'),
  validarDpi,
  validarFechaNacimiento,
  validarTelefono,
  validarDireccion,
  validarObservaciones,
];

const validarActualizacion = [
  body('nombre_paciente')
    .optional()
    .trim()
    .notEmpty().withMessage('nombre_paciente no puede estar vacío')
    .isLength({ max: 150 }).withMessage('nombre_paciente no puede superar los 150 caracteres'),
  validarDpi,
  validarFechaNacimiento,
  validarTelefono,
  validarDireccion,
  validarObservaciones,
];

const validarAnulacion = [
  body('motivo_anulacion')
    .trim()
    .notEmpty().withMessage('motivo_anulacion es requerido')
    .isLength({ max: 500 }).withMessage('motivo_anulacion no puede superar los 500 caracteres'),
];

const validarBusqueda = [
  query('id_laboratorio')
    .isInt({ min: 1 }).withMessage('id_laboratorio debe ser un entero positivo')
    .toInt(),
  query('busqueda')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('busqueda no puede superar los 150 caracteres'),
  query('estado')
    .optional()
    .isIn(['activo', 'anulado']).withMessage('estado debe ser activo o anulado'),
  query('pagina')
    .optional()
    .isInt({ min: 1 }).withMessage('pagina debe ser un entero positivo')
    .toInt(),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limite debe ser un entero entre 1 y 100')
    .toInt(),
];

// GET    /api/pacientes?id_laboratorio=&busqueda=&estado=&pagina=&limite=
router.get('/', verificarToken, rolesPaciente, validarBusqueda, PacienteController.buscar);

// GET    /api/pacientes/:id
router.get('/:id', verificarToken, rolesPaciente, validarId, PacienteController.obtenerPorId);

// POST   /api/pacientes
router.post('/', verificarToken, rolesPaciente, validarRegistro, PacienteController.registrar);

// PUT    /api/pacientes/:id
router.put(
  '/:id',
  verificarToken,
  rolesPaciente,
  validarId,
  validarActualizacion,
  PacienteController.actualizar,
);

// PATCH  /api/pacientes/:id/anular
router.patch(
  '/:id/anular',
  verificarToken,
  rolesPaciente,
  validarId,
  validarAnulacion,
  PacienteController.anular,
);

module.exports = router;
