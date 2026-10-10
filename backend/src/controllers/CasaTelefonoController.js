const CasaTelefonoService = require('../services/CasaTelefonoService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const id_casa = Number(req.params.id_casa);
  const { numero } = req.body;
  const telefono = await CasaTelefonoService.crearTelefono({ id_casa, numero });
  return res.status(201).json(telefono);
});

const obtenerPorCasa = asyncHandler(async (req, res) => {
  const id_casa = Number(req.params.id_casa);
  const telefonos = await CasaTelefonoService.obtenerPorCasa(id_casa);
  return res.status(200).json(telefonos);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const telefono = await CasaTelefonoService.obtenerPorId(Number(req.params.id_telefono));
  return res.status(200).json(telefono);
});

const actualizar = asyncHandler(async (req, res) => {
  const telefono = await CasaTelefonoService.actualizarTelefono(
    Number(req.params.id_telefono),
    req.body,
  );
  return res.status(200).json(telefono);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await CasaTelefonoService.eliminarTelefono(Number(req.params.id_telefono));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorCasa, obtenerPorId, actualizar, eliminar };
