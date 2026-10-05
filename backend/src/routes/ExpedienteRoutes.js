const { Router } = require('express');
const { param } = require('express-validator');
const BitacoraLaboratorioController = require('../controllers/BitacoraLaboratorioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();

const validarIdExpediente = [
  param('id')
    .isInt({ min: 1 }).withMessage('El id del expediente debe ser un entero positivo')
    .toInt(),
];

// GET /api/expedientes/:id/bitacora
router.get(
  '/:id/bitacora',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdExpediente,
  BitacoraLaboratorioController.obtenerPorExpediente,
);

module.exports = router;
