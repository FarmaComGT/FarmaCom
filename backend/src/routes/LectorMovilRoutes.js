const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const asyncHandler = require('../middlewares/asyncHandler');
const UsuarioDAO = require('../daos/UsuarioDAO');
const AppError = require('../errors/AppError');
const { lectorMovil } = require('../services/LectorMovilService');

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer'); next(); });
router.use(rateLimit({ windowMs: 60000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, message: { mensaje: 'Demasiadas solicitudes del lector. Espera un minuto.' } }));
router.use((req, _res, next) => {
  if (!req.secure) throw new AppError('El lector remoto requiere HTTPS.', 426);
  if (req.method !== 'GET' && !req.is('application/json')) throw new AppError('Se requiere contenido JSON.', 415);
  if (req.headers.origin && req.headers.origin !== (process.env.FRONTEND_URL || 'http://localhost:5173')) throw new AppError('Origen no permitido para el lector.', 403);
  next();
});
const tokenMovil = (req) => req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];

router.post('/movil/:id/conectar', rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { mensaje: 'Demasiados intentos de vinculación. Espera un minuto.' } }), (req, res) => {
  res.json(lectorMovil.conectar(req.params.id, tokenMovil(req)));
});
// La credencial del teléfono no se acepta en ninguna ruta de administración.
router.use('/movil/:id', asyncHandler(async (req, _res, next) => {
  const vinculado = lectorMovil.datosPropietario(req.params.id, tokenMovil(req));
  const usuario = await UsuarioDAO.obtenerPorId(vinculado.id_usuario);
  if (!usuario || usuario.estado_usuario !== 'activo' || !['dueno', 'administrador', 'dependiente'].includes(usuario.rol)
    || (usuario.token_version ?? 0) !== vinculado.token_version || usuario.id_sucursal !== vinculado.id_sucursal) {
    lectorMovil.invalidar(req.params.id);
    throw new AppError('La sesión de la computadora ya no es válida.', 410);
  }
  next();
}));
router.get('/movil/:id/estado', (req, res) => res.json(lectorMovil.estado(req.params.id, tokenMovil(req))));
router.post('/movil/:id/lecturas', (req, res) => res.json(lectorMovil.enviar(req.params.id, tokenMovil(req), req.body?.id, req.body?.codigo, req.body?.contexto)));
router.delete('/movil/:id', (req, res) => { lectorMovil.desconectar(req.params.id, tokenMovil(req)); res.sendStatus(204); });

router.use(verificarToken, verificarRol('dueno', 'administrador', 'dependiente'));
router.post('/sesiones', rateLimit({ windowMs: 60000, limit: 5, keyGenerator: (req) => String(req.usuario.id_usuario), standardHeaders: 'draft-8', legacyHeaders: false, message: { mensaje: 'Espera un minuto antes de crear otra vinculación.' } }), asyncHandler(async (req, res) => {
  let origen;
  try { origen = new URL(process.env.FRONTEND_URL); } catch { /* Se rechaza configuración incompleta. */ }
  if (!origen || origen.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname)) throw new AppError('Para vincular el celular, configura FRONTEND_URL con una dirección HTTPS accesible desde ambos dispositivos.', 503);
  const sesion = lectorMovil.crear(req.usuario, req.body?.destino);
  const url = new URL('/lector-movil', origen.origin);
  // El secreto queda en el fragmento: no viaja en la URL de una solicitud HTTP.
  url.hash = new URLSearchParams({ id: sesion.id, clave: sesion.token }).toString();
  try {
    const qr = await QRCode.toDataURL(url.href, { width: 288, margin: 2, errorCorrectionLevel: 'M' });
    const { token, ...datos } = sesion;
    res.status(201).json({ ...datos, enlace: url.href, qr });
  } catch (error) { lectorMovil.invalidar(sesion.id); throw error; }
}));
router.post('/sesiones/:id/pulso', (req, res) => {
  if (typeof req.body?.disponible !== 'boolean') throw new AppError('Disponibilidad inválida.', 400);
  res.json(lectorMovil.pulso(req.params.id, req.usuario, req.body.disponible, req.body.contexto, req.body.destino));
});
router.post('/sesiones/:id/confirmar', (req, res) => res.json(lectorMovil.confirmar(req.params.id, req.usuario)));
router.post('/sesiones/:id/acuse', (req, res) => res.json(lectorMovil.acuse(req.params.id, req.usuario, req.body?.id)));
router.delete('/sesiones/:id', (req, res) => { lectorMovil.revocar(req.params.id, req.usuario); res.sendStatus(204); });

module.exports = router;
