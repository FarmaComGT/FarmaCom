const { validationResult } = require('express-validator');
const LoteService = require('../services/LoteService');

// Lote 

const crear = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const resultado = await LoteService.crearLote(req.body);
    return res.status(201).json(resultado);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerPorSucursal = async (req, res) => {
  try {
    const lotes = await LoteService.obtenerPorSucursal(Number(req.params.id_sucursal));
    return res.status(200).json(lotes);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerPorProducto = async (req, res) => {
  try {
    const lotes = await LoteService.obtenerPorProducto(Number(req.params.id_producto));
    return res.status(200).json(lotes);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const lote = await LoteService.obtenerPorId(Number(req.params.id));
    return res.status(200).json(lote);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

// PATCH /api/lotes/:id — edición parcial de los datos del lote
const actualizar = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const lote = await LoteService.actualizarLote(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
    );
    return res.status(200).json(lote);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const resultado = await LoteService.eliminarLote(Number(req.params.id));
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

// GET /api/lotes/alertas  (global) y  GET /api/sucursales/:id_sucursal/lotes/alertas
const obtenerAlertas = async (req, res) => {
  try {
    const id_sucursal = req.params.id_sucursal ? Number(req.params.id_sucursal) : null;
    const alertas = await LoteService.obtenerAlertas(id_sucursal);
    return res.status(200).json(alertas);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = {
  crear,
  obtenerPorSucursal,
  obtenerPorProducto,
  obtenerPorId,
  actualizar,
  eliminar,
  obtenerAlertas,
};
