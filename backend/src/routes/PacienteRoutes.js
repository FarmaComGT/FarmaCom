const { Router } = require('express');
const { body, param, query } = require('express-validator');
const PacienteController = require('../controllers/PacienteController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();
const rolesPaciente = verificarRol('dueno', 'administrador', 'laboratorista');

const aNuloSiVacio = (valor) => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio || null;
};

const validarFechaReal = (valor) => {
  if (valor == null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio
    && fecha.getUTCMonth() === mes - 1
    && fecha.getUTCDate() === dia;
};

const obtenerHoyGuatemala = () => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo)?.value);
  return new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day')));
};

const validarRangoFechaNacimiento = (valor) => {
  if (valor == null) return true;
  const fecha = new Date(`${valor}T00:00:00Z`);
  const hoy = obtenerHoyGuatemala();
  const fechaMinima = new Date(Date.UTC(
    hoy.getUTCFullYear() - 121,
    hoy.getUTCMonth(),
    hoy.getUTCDate(),
  ));
  return fecha <= hoy && fecha > fechaMinima;
};

const validarId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarDpi = body('dpi')
  .optional({ nullable: true })
  .customSanitizer((valor) => {
    if (typeof valor !== 'string') return valor;
    const normalizado = valor.trim().replace(/[\s-]+/g, '');
    return normalizado || null;
  })
  .custom((valor) => valor == null || /^\d{13}$/.test(valor))
  .withMessage('dpi debe contener exactamente 13 dígitos');

const validarTelefono = body('telefono')
  .optional({ nullable: true })
  .customSanitizer(aNuloSiVacio)
  .custom((valor) => valor == null || /^[\d\s()+-]+$/.test(valor))
  .withMessage('telefono contiene caracteres no válidos')
  .custom((valor) => {
    if (valor == null) return true;
    const digitos = valor.replace(/\D/g, '').length;
    return digitos >= 8 && digitos <= 15;
  }).withMessage('telefono debe contener entre 8 y 15 dígitos');

const validarFechaNacimiento = body('fecha_nacimiento')
  .optional({ nullable: true })
  .customSanitizer(aNuloSiVacio)
  .custom(validarFechaReal).withMessage('fecha_nacimiento debe ser una fecha real con formato YYYY-MM-DD')
  .custom(validarRangoFechaNacimiento)
  .withMessage('fecha_nacimiento no puede ser futura ni corresponder a más de 120 años');

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
  .customSanitizer(aNuloSiVacio)
  .isLength({ max: 500 }).withMessage('direccion no puede superar los 500 caracteres');

const validarObservaciones = body('observaciones')
  .optional({ nullable: true })
  .customSanitizer(aNuloSiVacio)
  .isLength({ max: 2000 }).withMessage('observaciones no puede superar los 2000 caracteres');

const validarRegistro = [
  body('id_laboratorio')
    .isInt({ min: 1 }).withMessage('id_laboratorio debe ser un entero positivo')
    .toInt(),
  body('nombre_paciente')
    .trim()
    .notEmpty().withMessage('nombre_paciente es requerido')
    .isLength({ min: 2 }).withMessage('nombre_paciente debe tener al menos 2 caracteres')
    .matches(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u)
    .withMessage('nombre_paciente contiene caracteres no válidos')
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
    .isLength({ min: 2 }).withMessage('nombre_paciente debe tener al menos 2 caracteres')
    .matches(/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u)
    .withMessage('nombre_paciente contiene caracteres no válidos')
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
router.get('/', verificarToken, rolesPaciente, validarBusqueda, validateRequest, PacienteController.buscar);

// GET    /api/pacientes/:id
router.get('/:id', verificarToken, rolesPaciente, validarId, validateRequest, PacienteController.obtenerPorId);

// POST   /api/pacientes
router.post('/', verificarToken, rolesPaciente, validarRegistro, validateRequest, PacienteController.registrar);

// PUT    /api/pacientes/:id
router.put(
  '/:id',
  verificarToken,
  rolesPaciente,
  validarId,
  validarActualizacion,
  validateRequest,
  PacienteController.actualizar,
);

// PATCH  /api/pacientes/:id/anular
router.patch(
  '/:id/anular',
  verificarToken,
  rolesPaciente,
  validarId,
  validarAnulacion,
  validateRequest,
  PacienteController.anular,
);

// DELETE /api/pacientes/:id
router.delete(
  '/:id',
  verificarToken,
  rolesPaciente,
  validarId,
  validateRequest,
  PacienteController.eliminar,
);

module.exports = router;
