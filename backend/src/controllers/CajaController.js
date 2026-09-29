const { validationResult } = require('express-validator');
const CajaService = require('../services/CajaService');

const responderErrores = (req, res) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return false;
  res.status(400).json({ errores: errores.array() });
  return true;
};

const responder = (operacion) => async (req, res) => {
  if (responderErrores(req, res)) return;

  try {
    await operacion(req, res);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const crear = responder(async (req, res) => {
  const caja = await CajaService.crearCaja(req.body);
  res.status(201).json(caja);
});

const obtenerTodas = responder(async (req, res) => {
  const cajas = await CajaService.obtenerCajas(req.query, req.usuario);
  res.status(200).json(cajas);
});

const actualizar = responder(async (req, res) => {
  const caja = await CajaService.actualizarCaja(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  res.status(200).json(caja);
});

const abrirSesion = responder(async (req, res) => {
  const sesion = await CajaService.abrirSesion(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  res.status(201).json(sesion);
});

const obtenerSesionActual = responder(async (req, res) => {
  const sesion = await CajaService.obtenerSesionActual(
    Number(req.params.id),
    req.usuario,
  );
  res.status(200).json(sesion);
});

const registrarMovimiento = responder(async (req, res) => {
  const movimiento = await CajaService.registrarMovimiento(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  res.status(201).json(movimiento);
});

const cerrarSesion = responder(async (req, res) => {
  const cierre = await CajaService.cerrarSesion(
    Number(req.params.id),
    req.body,
    req.usuario,
  );
  res.status(200).json(cierre);
});

const obtenerCierres = responder(async (req, res) => {
  const cierres = await CajaService.obtenerCierres(req.query);
  res.status(200).json(cierres);
});

const obtenerResumenDiario = responder(async (req, res) => {
  const resumen = await CajaService.obtenerResumenDiario(
    req.query.fecha,
    req.query.id_sucursal,
    req.query.id_caja,
  );
  res.status(200).json(resumen);
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
