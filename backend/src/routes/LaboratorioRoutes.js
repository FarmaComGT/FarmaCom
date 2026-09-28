const { Router } = require('express');
const { body, param } = require('express-validator');
const LaboratorioController = require('../controllers/LaboratorioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();
const rolesLaboratorio = verificarRol('dueno', 'administrador', 'laboratorista');
const rolesAdministracion = verificarRol('dueno', 'administrador');
const validarDatos = [
  body('id_ciudad')
    .isInt({ min: 1 }).withMessage('id_ciudad debe ser un entero positivo')
    .toInt(),
  body('nombre_laboratorio')
    .trim()
    .notEmpty().withMessage('nombre_laboratorio es requerido')
    .isLength({ max: 100 }).withMessage('nombre_laboratorio no puede superar los 100 caracteres'),
  body('direccion')
    .trim()
    .notEmpty().withMessage('direccion es requerida')
    .isLength({ max: 255 }).withMessage('direccion no puede superar los 255 caracteres'),
];
const validarId = param('id')
  .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
  .toInt();

// GET /api/laboratorios
router.get('/', verificarToken, rolesLaboratorio, LaboratorioController.listar);
router.post('/', verificarToken, rolesAdministracion, validarDatos, LaboratorioController.crear);
router.put('/:id', verificarToken, rolesAdministracion, validarId, validarDatos, LaboratorioController.actualizar);

module.exports = router;
