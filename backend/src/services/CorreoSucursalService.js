const CorreoSucursalDAO = require('../daos/CorreoSucursalDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const AppError = require('../errors/AppError');

const crearCorreo = async({ id_sucursal, correo }) => {
    const sucursal = await SucursalDAO.obtenerPorId(id_sucursal);
    if (!sucursal) {
        throw new AppError('La sucursal no existe', 404);
    }

    const duplicado = await CorreoSucursalDAO.obtenerPorCorreo(correo);
    if (duplicado) {
        throw new AppError('Ya existe ese correo registrado en una sucursal', 409);
    }

    return await CorreoSucursalDAO.crear({ id_sucursal, correo });
};

const obtenerPorSucursal = async(id_sucursal) => {
    const sucursal = await SucursalDAO.obtenerPorId(id_sucursal);
    if (!sucursal) {
        throw new AppError('La sucursal no existe', 404);
    }

    return await CorreoSucursalDAO.obtenerPorSucursal(id_sucursal);
};

const obtenerPorId = async(id_correo_sucursal) => {
    const correo = await CorreoSucursalDAO.obtenerPorId(id_correo_sucursal);
    if (!correo) {
        throw new AppError('Correo no encontrado', 404);
    }

    return correo;
};

const actualizarCorreo = async(id_correo_sucursal, { correo }) => {
    const existente = await CorreoSucursalDAO.obtenerPorId(id_correo_sucursal);
    if (!existente) {
        throw new AppError('Correo no encontrado', 404);
    }

    if (correo && correo !== existente.correo) {
        const duplicado = await CorreoSucursalDAO.obtenerPorCorreo(correo);
        if (duplicado) {
            throw new AppError('Ya existe ese correo registrado en una sucursal', 409);
        }
    }

    return await CorreoSucursalDAO.actualizar(id_correo_sucursal, { correo });
};

const eliminarCorreo = async(id_correo_sucursal) => {
    const eliminado = await CorreoSucursalDAO.eliminar(id_correo_sucursal);
    if (!eliminado) {
        throw new AppError('Correo no encontrado', 404);
    }

    return { mensaje: 'Correo eliminado correctamente' };
};

module.exports = {
    crearCorreo,
    obtenerPorSucursal,
    obtenerPorId,
    actualizarCorreo,
    eliminarCorreo,
};
