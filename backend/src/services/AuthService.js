const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsuarioDAO = require('../daos/UsuarioDAO');
const { TOKEN_EXPIRY } = require('../config/auth');
const AppError = require('../errors/AppError');

const mapUsuarioSesion = (usuario) => ({
    id_usuario: usuario.id_usuario,
    nombre_usuario: usuario.nombre_usuario,
    correo_usuario: usuario.correo_usuario,
    rol: usuario.rol,
    id_sucursal: usuario.id_sucursal,
    id_laboratorio: usuario.id_laboratorio,
});

const login = async (correo_usuario, contrasena) => {
    const usuario = await UsuarioDAO.obtenerPorCorreo(correo_usuario);
    if (!usuario) {
        throw new AppError('Credenciales inválidas', 401);
    }

    if (usuario.estado_usuario !== 'activo') {
        throw new AppError('La cuenta está inactiva.', 403);
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
        throw new AppError('Credenciales inválidas', 401);
    }

    const payload = {
        id_usuario: usuario.id_usuario,
        id_sucursal: usuario.id_sucursal,
        rol: usuario.rol,
        token_version: usuario.token_version ?? 0,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    return {
        token,
        usuario: mapUsuarioSesion(usuario),
    };
};

const obtenerSesionActual = async (id_usuario) => {
    const usuario = await UsuarioDAO.obtenerPorId(id_usuario);

    if (!usuario) {
        throw new AppError('Usuario no encontrado.', 404);
    }

    if (usuario.estado_usuario !== 'activo') {
        throw new AppError('La cuenta está inactiva.', 403);
    }

    return mapUsuarioSesion(usuario);
};

const logout = async (token) => {
    if (!token) {
        return { mensaje: 'Sesión cerrada correctamente' };
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await UsuarioDAO.obtenerPorId(payload.id_usuario);

        if (usuario && (usuario.token_version ?? 0) === (payload.token_version ?? 0)) {
            await UsuarioDAO.incrementarTokenVersion(payload.id_usuario);
        }
    } catch (error) {
        // Si el token ya expiró o es inválido, igual se responde como logout exitoso.
    }

    return { mensaje: 'Sesión cerrada correctamente' };
};

module.exports = { login, obtenerSesionActual, logout };
