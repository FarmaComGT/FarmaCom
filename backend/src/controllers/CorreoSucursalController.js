const CorreoSucursalService = require('../services/CorreoSucursalService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
    const id_sucursal = Number(req.params.id_sucursal);
    const { correo } = req.body;
    const correoCreado = await CorreoSucursalService.crearCorreo({ id_sucursal, correo });
    return res.status(201).json(correoCreado);
});

const obtenerPorSucursal = asyncHandler(async (req, res) => {
    const id_sucursal = Number(req.params.id_sucursal);
    const correos = await CorreoSucursalService.obtenerPorSucursal(id_sucursal);
    return res.status(200).json(correos);
});

const obtenerPorId = asyncHandler(async (req, res) => {
    const correo = await CorreoSucursalService.obtenerPorId(Number(req.params.id));
    return res.status(200).json(correo);
});

const actualizar = asyncHandler(async (req, res) => {
    const correo = await CorreoSucursalService.actualizarCorreo(
        Number(req.params.id),
        req.body,
    );
    return res.status(200).json(correo);
});

const eliminar = asyncHandler(async (req, res) => {
    const resultado = await CorreoSucursalService.eliminarCorreo(Number(req.params.id));
    return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorSucursal, obtenerPorId, actualizar, eliminar };
