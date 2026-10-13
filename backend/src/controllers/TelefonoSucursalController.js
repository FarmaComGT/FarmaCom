const TelefonoSucursalService = require('../services/TelefonoSucursalService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
    const id_sucursal = Number(req.params.id_sucursal);
    const { numero } = req.body;
    const telefono = await TelefonoSucursalService.crearTelefono({ id_sucursal, numero });
    return res.status(201).json(telefono);
});

const obtenerPorSucursal = asyncHandler(async (req, res) => {
    const id_sucursal = Number(req.params.id_sucursal);
    const telefonos = await TelefonoSucursalService.obtenerPorSucursal(id_sucursal);
    return res.status(200).json(telefonos);
});

const obtenerPorId = asyncHandler(async (req, res) => {
    const telefono = await TelefonoSucursalService.obtenerPorId(Number(req.params.id));
    return res.status(200).json(telefono);
});

const actualizar = asyncHandler(async (req, res) => {
    const telefono = await TelefonoSucursalService.actualizarTelefono(
        Number(req.params.id),
        req.body,
    );
    return res.status(200).json(telefono);
});

const eliminar = asyncHandler(async (req, res) => {
    const resultado = await TelefonoSucursalService.eliminarTelefono(Number(req.params.id));
    return res.status(200).json(resultado);
});

module.exports = { crear, obtenerPorSucursal, obtenerPorId, actualizar, eliminar };
