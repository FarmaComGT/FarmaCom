const jwt = require('jsonwebtoken');
const UsuarioDAO = require('../daos/UsuarioDAO');

const verificarToken = async (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Inicia sesion primero.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await UsuarioDAO.obtenerPorId(payload.id_usuario);

        if (!usuario) {
            return res.status(401).json({ mensaje: 'Token invalido o expirado.' });
        }

        if (usuario.estado_usuario !== 'activo') {
            return res.status(403).json({ mensaje: 'La cuenta está inactiva.' });
        }

        if ((payload.token_version ?? 0) !== (usuario.token_version ?? 0)) {
            return res.status(401).json({ mensaje: 'La sesion ya no es valida. Inicia sesion de nuevo.' });
        }

        req.usuario = {
            id_usuario: usuario.id_usuario,
            id_sucursal: usuario.id_sucursal,
            id_laboratorio: usuario.id_laboratorio,
            rol: usuario.rol,
            token_version: usuario.token_version,
        };

        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token invalido o expirado.' });
    }
};

module.exports = verificarToken;
