const ClienteContactoService = require('../services/ClienteContactoService');
const asyncHandler = require('../middlewares/asyncHandler');

const idCliente = (req) => Number(req.params.id);

const obtenerTelefonos = asyncHandler(async (req, res) => {
  const telefonos = await ClienteContactoService.listarTelefonos(idCliente(req));
  return res.status(200).json(telefonos);
});

const crearTelefono = asyncHandler(async (req, res) => {
  const telefono = await ClienteContactoService.agregarTelefono(idCliente(req), req.body.numero);
  return res.status(201).json(telefono);
});

const actualizarTelefono = asyncHandler(async (req, res) => {
  const telefono = await ClienteContactoService.actualizarTelefono(
    idCliente(req),
    Number(req.params.id_telefono),
    req.body.numero,
  );
  return res.status(200).json(telefono);
});

const eliminarTelefono = asyncHandler(async (req, res) => {
  const resultado = await ClienteContactoService.eliminarTelefono(
    idCliente(req),
    Number(req.params.id_telefono),
  );
  return res.status(200).json(resultado);
});

const obtenerCorreos = asyncHandler(async (req, res) => {
  const correos = await ClienteContactoService.listarCorreos(idCliente(req));
  return res.status(200).json(correos);
});

const crearCorreo = asyncHandler(async (req, res) => {
  const correo = await ClienteContactoService.agregarCorreo(idCliente(req), req.body.correo);
  return res.status(201).json(correo);
});

const actualizarCorreo = asyncHandler(async (req, res) => {
  const correo = await ClienteContactoService.actualizarCorreo(
    idCliente(req),
    Number(req.params.id_email),
    req.body.correo,
  );
  return res.status(200).json(correo);
});

const eliminarCorreo = asyncHandler(async (req, res) => {
  const resultado = await ClienteContactoService.eliminarCorreo(
    idCliente(req),
    Number(req.params.id_email),
  );
  return res.status(200).json(resultado);
});

module.exports = {
  obtenerTelefonos,
  crearTelefono,
  actualizarTelefono,
  eliminarTelefono,
  obtenerCorreos,
  crearCorreo,
  actualizarCorreo,
  eliminarCorreo,
};
