const { Router } = require('express');
const { body, query, param, checkExact } = require('express-validator');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../middlewares/asyncHandler');
const Service = require('../services/ResumenDiarioGestionService');
const router = Router();
router.use(verificarToken, verificarRol('dueno'), (_req, res, next) => {
  res.set('Cache-Control', 'no-store'); next();
});

router.get('/configuracion', asyncHandler(async (req, res) => {
  res.json(await Service.obtenerConfiguracion(req.usuario.id_usuario));
}));
router.put('/configuracion', [
  body('correo_destinatario').isString().bail().trim().isLength({ max: 254 })
    .if((valor) => valor !== '').isEmail().withMessage('Ingresa un correo válido'),
  body('hora_envio').isString().bail().matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('La hora debe tener formato HH:mm'),
  body('automatico').custom((v) => typeof v === 'boolean'),
  body('todas_sucursales').custom((v) => typeof v === 'boolean'),
  body('sucursales').isArray({ max: 100 }),
  body('sucursales.*').custom((v) => Number.isInteger(v) && v > 0 && v <= 2147483647),
  checkExact([], { locations: ['body'] }),
], validateRequest, asyncHandler(async (req, res) => {
  res.json(await Service.guardarConfiguracion(req.usuario.id_usuario, req.body));
}));

router.post('/historial', [
  body('fecha').optional().isISO8601({ strict: true }).matches(/^\d{4}-\d{2}-\d{2}$/),
  checkExact([], { locations: ['body'] }),
], validateRequest, asyncHandler(async (req, res) => {
  const reporte = await Service.crearReporte(req.usuario.id_usuario, req.body?.fecha);
  res.location(`/api/reportes/resumen-diario/historial/${reporte.id_reporte}`);
  res.status(201).json(reporte);
}));
router.get('/historial', [
  query('pagina').default(1).isInt({ min: 1, max: 1000000 }).toInt(),
  query('limite').default(20).isInt({ min: 1, max: 50 }).toInt(),
], validateRequest, asyncHandler(async (req, res) => {
  res.json(await Service.listarReportes(req.usuario.id_usuario, req.query.pagina, req.query.limite));
}));
router.get(['/historial/:id', '/historial/:id/pdf'], [
  param('id').isInt({ min: 1, max: Number.MAX_SAFE_INTEGER }),
], validateRequest, asyncHandler(async (req, res) => {
  const esPdf = req.path.endsWith('/pdf');
  const reporte = await Service.obtenerReporte(req.usuario.id_usuario, req.params.id, esPdf);
  if (!esPdf) return res.json(reporte);
  res.type('application/pdf');
  res.set('Content-Disposition', `attachment; filename="resumen-ventas-${reporte.fecha}-${reporte.id_reporte}.pdf"`);
  return res.send(reporte.pdf);
}));
module.exports = router;
