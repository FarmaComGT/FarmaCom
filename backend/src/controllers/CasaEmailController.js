const CasaEmailService = require('../services/CasaEmailService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const id_casa = Number(req.params.id_casa);
  const { correo } = req.body;
  const email = await CasaEmailService.crearEmail({ id_casa, correo });
  return res.status(201).json(email);
});

const obtenerPorCasa = asyncHandler(async (req, res) => {
  const id_casa = Number(req.params.id_casa);
  const emails = await CasaEmailService.obtenerPorCasa(id_casa);
  return res.status(200).json(emails);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const email = await CasaEmailService.obtenerPorId(Number(req.params.id_email));
  return res.status(200).json(email);
});

const actualizar = asyncHandler(async (req, res) => {
  const email = await CasaEmailService.actualizarEmail(Number(req.params.id_email), req.body);
  return res.status(200).json(email);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await CasaEmailService.eliminarEmail(Number(req.params.id_email));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorCasa, obtenerPorId, actualizar, eliminar };
