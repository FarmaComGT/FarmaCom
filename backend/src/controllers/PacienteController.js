const PacienteService = require('../services/PacienteService');
const asyncHandler = require('../middlewares/asyncHandler');

const registrar = asyncHandler(async (req, res) => {
  const paciente = await PacienteService.registrarPaciente(req.body, req.usuario);
  return res.status(201).json(paciente);
});

const buscar = asyncHandler(async (req, res) => {
  const resultado = await PacienteService.buscarPacientes({
    id_laboratorio: req.query.id_laboratorio,
    busqueda: req.query.busqueda,
    estado: req.query.estado,
    pagina: req.query.pagina,
    limite: req.query.limite,
  }, req.usuario);
  return res.status(200).json(resultado);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const paciente = await PacienteService.obtenerPorId(Number(req.params.id), req.usuario);
  return res.status(200).json(paciente);
});

const actualizar = asyncHandler(async (req, res) => {
  const paciente = await PacienteService.actualizarPaciente(Number(req.params.id), req.body, req.usuario);
  return res.status(200).json(paciente);
});

const anular = asyncHandler(async (req, res) => {
  const paciente = await PacienteService.anularPaciente(
    Number(req.params.id),
    req.body.motivo_anulacion,
    req.usuario,
  );
  return res.status(200).json(paciente);
});

const eliminar = asyncHandler(async (req, res) => {
  await PacienteService.eliminarPaciente(Number(req.params.id), req.usuario);
  return res.status(204).send();
});

module.exports = {
  registrar, buscar, obtenerPorId, actualizar, anular, eliminar,
};
