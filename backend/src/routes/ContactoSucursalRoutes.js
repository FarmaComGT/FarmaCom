const { Router } = require('express');
const { body, param } = require('express-validator');
const ContactoSucursalController = require('../controllers/ContactoSucursalController');
const validateRequest = require('../middlewares/validateRequest');

const router = Router({ mergeParams: true });

const validarIdSucursal = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarIdTelefono = [
  param('idTelefono')
    .isInt({ min: 1 }).withMessage('El idTelefono debe ser un entero positivo')
    .toInt(),
];

const validarIdCorreo = [
  param('idCorreo').isInt({ min: 1 }).withMessage('El idCorreo debe ser un entero positivo').toInt(),
];

const validarTelefono = [
  body('numero').trim().notEmpty().withMessage('El número es requerido'),
];

const validarCorreo = [
  body('correo')
    .trim()
    .notEmpty().withMessage('El correo es requerido')
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

// GET    /api/sucursales/:id/contactos
router.get('/', validarIdSucursal, validateRequest, ContactoSucursalController.obtener);

// POST   /api/sucursales/:id/contactos/telefonos
router.post(
  '/telefonos',
  validarIdSucursal,
  validarTelefono,
  validateRequest,
  ContactoSucursalController.agregarTelefono,
);

// DELETE /api/sucursales/:id/contactos/telefonos/:idTelefono
router.delete(
  '/telefonos/:idTelefono',
  validarIdSucursal,
  validarIdTelefono,
  validateRequest,
  ContactoSucursalController.eliminarTelefono,
);

// POST   /api/sucursales/:id/contactos/correos
router.post(
  '/correos',
  validarIdSucursal,
  validarCorreo,
  validateRequest,
  ContactoSucursalController.agregarCorreo,
);

// DELETE /api/sucursales/:id/contactos/correos/:idCorreo
router.delete(
  '/correos/:idCorreo',
  validarIdSucursal,
  validarIdCorreo,
  validateRequest,
  ContactoSucursalController.eliminarCorreo,
);

module.exports = router;
