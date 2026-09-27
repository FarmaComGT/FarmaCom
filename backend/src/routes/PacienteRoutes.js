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

const validarEdadManual = body('edad_manual')
  .optional({ nullable: true })
  .isInt({ min: 0, max: 120 }).withMessage('edad_manual debe ser un entero entre 0 y 120')
  .toInt();

const validarSexoRegistro = body('sexo')
  .isIn(['M', 'F', 'Otro']).withMessage('sexo debe ser M, F u Otro');

const validarSexoActualizacion = body('sexo')
  .optional()
  .isIn(['M', 'F', 'Otro']).withMessage('sexo debe ser M, F u Otro');

// En el alta, fecha_nacimiento/edad_manual son excluyentes y una de las dos es obligatoria.
const validarExclusividadEdadRegistro = body().custom((_valor, { req }) => {
  const tieneFecha = req.body.fecha_nacimiento != null && req.body.fecha_nacimiento !== '';
  const tieneEdadManual = req.body.edad_manual != null && req.body.edad_manual !== '';

  if (tieneFecha === tieneEdadManual) {
    throw new Error('Debe indicarse exactamente uno de fecha_nacimiento o edad_manual');
  }
  return true;
});

// En la actualización solo se valida la exclusividad si el cliente toca alguno de los dos campos.
const validarExclusividadEdadActualizacion = body().custom((_valor, { req }) => {
  const incluyeFecha = Object.prototype.hasOwnProperty.call(req.body, 'fecha_nacimiento');
  const incluyeEdadManual = Object.prototype.hasOwnProperty.call(req.body, 'edad_manual');
  if (!incluyeFecha && !incluyeEdadManual) return true;

  const tieneFecha = req.body.fecha_nacimiento != null && req.body.fecha_nacimiento !== '';
  const tieneEdadManual = req.body.edad_manual != null && req.body.edad_manual !== '';

  if (tieneFecha === tieneEdadManual) {
    throw new Error('Debe indicarse exactamente uno de fecha_nacimiento o edad_manual, no ambos ni ninguno');
  }
  return true;
});

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
  validarEdadManual,
  validarSexoRegistro,
  validarExclusividadEdadRegistro,
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
  validarEdadManual,
  validarSexoActualizacion,
  validarExclusividadEdadActualizacion,
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
