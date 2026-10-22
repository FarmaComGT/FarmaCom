const authService = require('../services/AuthService');
const asyncHandler = require('../middlewares/asyncHandler');
const {
    COOKIE_NAME,
    buildAuthCookieOptions,
    buildAuthCookieClearOptions,
} = require('../config/auth');

const login = asyncHandler(async (req, res) => {
    const { correo_usuario, contrasena } = req.body;
    const { token, usuario } = await authService.login(correo_usuario, contrasena);

    // Guardar el JWT en una cookie httpOnly con la misma expiracion que el token.
    res.cookie(COOKIE_NAME, token, buildAuthCookieOptions());

    return res.status(200).json({ usuario });
});

const logout = asyncHandler(async(req, res) => {
    const resultado = await authService.logout(req.cookies[COOKIE_NAME]);
    res.clearCookie(COOKIE_NAME, buildAuthCookieClearOptions());
    return res.status(200).json(resultado);
});

const me = asyncHandler(async(req, res) => {
    const usuario = await authService.obtenerSesionActual(req.usuario.id_usuario);
    return res.status(200).json({ usuario });
});

module.exports = { login, logout, me };
