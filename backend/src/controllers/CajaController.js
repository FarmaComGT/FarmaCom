const CajaService = require('../services/CajaService');
const asyncHandler = require('../middlewares/asyncHandler');

const responder = (operacion) => asyncHandler(operacion);

const crear = responder(async (req, res) => {
  const caja = await CajaService.crearCaja(req.body);
  return res.status(201).json(caja);
});

const obtenerTodas = responder(async (req, res) => {
  const cajas = await CajaService.obtenerCajas(req.query, req.usuario);
  return res.status(200).json(cajas);
});

const actualizar = responder(async (req, res) => {
  const caja = await CajaService.actualizarCaja(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  return res.status(200).json(caja);
});

const abrirSesion = responder(async (req, res) => {
  const sesion = await CajaService.abrirSesion(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  return res.status(201).json(sesion);
});

const obtenerSesionActual = responder(async (req, res) => {
  const sesion = await CajaService.obtenerSesionActual(
    Number(req.params.id),
    req.usuario,
  );
  return res.status(200).json(sesion);
});

const registrarMovimiento = responder(async (req, res) => {
  const movimiento = await CajaService.registrarMovimiento(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  return res.status(201).json(movimiento);
});

const cerrarSesion = responder(async (req, res) => {
  const cierre = await CajaService.cerrarSesion(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  return res.status(200).json(cierre);
});

const obtenerCierres = responder(async (req, res) => {
  const cierres = await CajaService.obtenerCierres(req.query);
  return res.status(200).json(cierres);
});

const obtenerResumenDiario = responder(async (req, res) => {
  const resumen = await CajaService.obtenerResumenDiario(
    req.query.fecha,
    req.query.id_sucursal,
    req.query.id_caja,
  );
  return res.status(200).json(resumen);
});

module.exports = {
  crear,
  obtenerTodas,
  actualizar,
  abrirSesion,
  obtenerSesionActual,
  registrarMovimiento,
  cerrarSesion,
  obtenerCierres,
  obtenerResumenDiario,
};
