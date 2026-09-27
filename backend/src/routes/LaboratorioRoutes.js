const { Router } = require('express');
const LaboratorioController = require('../controllers/LaboratorioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();
const rolesLaboratorio = verificarRol('dueno', 'administrador', 'laboratorista');

// GET /api/laboratorios
router.get('/', verificarToken, rolesLaboratorio, LaboratorioController.listar);

module.exports = router;
