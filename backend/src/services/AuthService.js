const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsuarioDAO = require('../daos/UsuarioDAO');
const CajaDAO = require('../daos/CajaDAO');
const { TOKEN_EXPIRY } = require('../config/auth');
const AppError = require('../errors/AppError');

const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas';
// Hash bcrypt válido y constante para que un correo inexistente recorra la misma
// operación costosa que una contraseña incorrecta, sin asociarse a una cuenta real.
const HASH_COMPARACION_FICTICIO = '$2b$10$C6UzMDM.H6dfI/f/IKcEe.1Z5L9hLXKq4U6o7v7P4J7v7ZQp5Xz1S';

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
    const hashComparacion = usuario?.contrasena_hash || HASH_COMPARACION_FICTICIO;
    const contrasenaValida = await bcrypt.compare(contrasena, hashComparacion);

    if (!usuario || usuario.estado_usuario !== 'activo' || !contrasenaValida) {
        throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
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

const describirTurnoAbierto = (turno) => (
    `${turno.nombre_caja}/${turno.nombre_sucursal}`
);

const construirMensajeTurnoAbierto = (turnos) => {
    const detalle = turnos.map(describirTurnoAbierto).join(', ');
    return turnos.length === 1
        ? `No puedes cerrar sesión con un turno de caja abierto (${detalle}). Dirígete a Caja › Operación para cerrar el turno actual.`
        : `No puedes cerrar sesión con turnos de caja abiertos (${detalle}). Dirígete a Caja › Operación para cerrar los turnos actuales.`;
};

const obtenerSesionVigente = async (token) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await UsuarioDAO.obtenerPorId(payload.id_usuario);
        if (usuario && (usuario.token_version ?? 0) === (payload.token_version ?? 0)) {
            return usuario;
        }
    } catch (error) {
        // Un token expirado o inválido no tiene sesión vigente que invalidar.
    }
    return null;
};

const logout = async (token) => {
    const respuesta = { mensaje: 'Sesión cerrada correctamente' };
    if (!token) return respuesta;

    const usuario = await obtenerSesionVigente(token);
    if (!usuario) return respuesta;

    // Un turno de caja abierto por este usuario no puede quedar huérfano:
    // otros dependientes no lo ven y nadie más podría operarlo.
    const turnosAbiertos = await CajaDAO.obtenerSesionesAbiertasPorUsuario(usuario.id_usuario);
    if (turnosAbiertos.length > 0) {
        throw new AppError(construirMensajeTurnoAbierto(turnosAbiertos), 409);
    }

    await UsuarioDAO.incrementarTokenVersion(usuario.id_usuario);
    return respuesta;
};

module.exports = { login, obtenerSesionActual, logout };
