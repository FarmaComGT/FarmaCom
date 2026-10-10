const TelefonoSucursalDAO = require('../daos/TelefonoSucursalDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const AppError = require('../errors/AppError');

const crearTelefono = async({ id_sucursal, numero }) => {
    const sucursal = await SucursalDAO.obtenerPorId(id_sucursal);
    if (!sucursal) {
        throw new AppError('La sucursal no existe', 404);
    }

    return await TelefonoSucursalDAO.crear({ id_sucursal, numero });
};

const obtenerPorSucursal = async(id_sucursal) => {
    const sucursal = await SucursalDAO.obtenerPorId(id_sucursal);
    if (!sucursal) {
        throw new AppError('La sucursal no existe', 404);
    }

    return await TelefonoSucursalDAO.obtenerPorSucursal(id_sucursal);
};

const obtenerPorId = async(id_telefono_sucursal) => {
    const telefono = await TelefonoSucursalDAO.obtenerPorId(id_telefono_sucursal);
    if (!telefono) {
        throw new AppError('Teléfono no encontrado', 404);
    }

    return telefono;
};

const actualizarTelefono = async(id_telefono_sucursal, { numero }) => {
    const existente = await TelefonoSucursalDAO.obtenerPorId(id_telefono_sucursal);
    if (!existente) {
        throw new AppError('Teléfono no encontrado', 404);
    }

    return await TelefonoSucursalDAO.actualizar(id_telefono_sucursal, { numero });
};

const eliminarTelefono = async(id_telefono_sucursal) => {
    const eliminado = await TelefonoSucursalDAO.eliminar(id_telefono_sucursal);
    if (!eliminado) {
        throw new AppError('Teléfono no encontrado', 404);
    }

    return { mensaje: 'Teléfono eliminado correctamente' };
};

module.exports = {
    crearTelefono,
    obtenerPorSucursal,
    obtenerPorId,
    actualizarTelefono,
    eliminarTelefono,
};
