const bcrypt = require('bcrypt');
const UsuarioDAO = require('../daos/UsuarioDAO');
const LaboratorioDAO = require('../daos/LaboratorioDAO');

const SALT_ROUNDS = 10;

const errorConEstado = (mensaje, status) => {
    const error = new Error(mensaje);
    error.status = status;
    return error;
};

const resolverLaboratorio = async(rol, id_laboratorio) => {
    if (rol !== 'laboratorista') {
        return null;
    }

    const id = Number(id_laboratorio);
    if (!Number.isInteger(id) || id < 1) {
        throw errorConEstado('Un laboratorista debe tener un laboratorio asignado', 400);
    }

    const laboratorio = await LaboratorioDAO.obtenerPorId(id);
    if (!laboratorio || !laboratorio.activo) {
        throw errorConEstado('Laboratorio no encontrado o inactivo', 400);
    }

    return id;
};

const crearUsuario = async({ id_sucursal, id_laboratorio, nombre_usuario, correo_usuario, contrasena, rol }) => {
    const existente = await UsuarioDAO.obtenerPorCorreo(correo_usuario);
    if (existente) {
        const error = new Error('El correo ya está registrado');
        error.status = 409;
        throw error;
    }

    const laboratorioAsignado = await resolverLaboratorio(rol, id_laboratorio);
    const contrasena_hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
    const usuario = await UsuarioDAO.crear({
        id_sucursal,
        id_laboratorio: laboratorioAsignado,
        nombre_usuario,
        correo_usuario,
        contrasena_hash,
        rol,
    });

    delete usuario.contrasena_hash;
    return usuario;
};

const obtenerTodos = async() => {
    const usuarios = await UsuarioDAO.obtenerTodos();
    return usuarios.map(u => { delete u.contrasena_hash; return u; });
};

const obtenerPorId = async(id_usuario) => {
    const usuario = await UsuarioDAO.obtenerPorId(id_usuario);
    if (!usuario) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }
    delete usuario.contrasena_hash;
    return usuario;
};

const obtenerPorSucursal = async(id_sucursal) => {
    const usuarios = await UsuarioDAO.obtenerPorSucursal(id_sucursal);
    return usuarios.map(u => { delete u.contrasena_hash; return u; });
};

const actualizarUsuario = async(id_usuario, campos) => {
    const existente = await UsuarioDAO.obtenerPorId(id_usuario);
    if (!existente) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    if (campos.correo_usuario && campos.correo_usuario !== existente.correo_usuario) {
        const conMismoCorreo = await UsuarioDAO.obtenerPorCorreo(campos.correo_usuario);
        if (conMismoCorreo) {
            const error = new Error('El correo ya está en uso por otro usuario');
            error.status = 409;
            throw error;
        }
    }

    const rolFinal = campos.rol ?? existente.rol;
    const laboratorioSolicitado = Object.prototype.hasOwnProperty.call(campos, 'id_laboratorio')
        ? campos.id_laboratorio
        : existente.id_laboratorio;
    const id_laboratorio = await resolverLaboratorio(rolFinal, laboratorioSolicitado);

    const usuario = await UsuarioDAO.actualizar(id_usuario, {
        ...campos,
        rol: rolFinal,
        id_laboratorio,
    });
    delete usuario.contrasena_hash;
    return usuario;
};

const cambiarContrasena = async(id_usuario, contrasena_actual, contrasena_nueva) => {
    const usuario = await UsuarioDAO.obtenerPorId(id_usuario);
    if (!usuario) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    const esValida = await bcrypt.compare(contrasena_actual, usuario.contrasena_hash);
    if (!esValida) {
        const error = new Error('La contraseña actual es incorrecta');
        error.status = 401;
        throw error;
    }

    const nueva_hash = await bcrypt.hash(contrasena_nueva, SALT_ROUNDS);
    await UsuarioDAO.actualizarContrasena(id_usuario, nueva_hash);
    await UsuarioDAO.incrementarTokenVersion(id_usuario);
    return { mensaje: 'Contraseña actualizada correctamente' };
};

const cambiarEstado = async(id_usuario, nuevo_estado) => {
    const existente = await UsuarioDAO.obtenerPorId(id_usuario);
    if (!existente) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    const usuario = await UsuarioDAO.cambiarEstado(id_usuario, nuevo_estado);
    delete usuario.contrasena_hash;
    return usuario;
};

const eliminarUsuario = async(id_usuario) => {
    const eliminado = await UsuarioDAO.eliminar(id_usuario);
    if (!eliminado) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }
    return { mensaje: 'Usuario eliminado correctamente' };
};

module.exports = {
    crearUsuario,
    obtenerTodos,
    obtenerPorId,
    obtenerPorSucursal,
    actualizarUsuario,
    cambiarContrasena,
    cambiarEstado,
    eliminarUsuario,
};
