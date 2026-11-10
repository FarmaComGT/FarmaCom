const usuarioService = require('../services/UsuarioService');
const AppError = require('../errors/AppError');
const asyncHandler = require('../middlewares/asyncHandler');

const esRolElevado = (rol) => ['dueno', 'administrador'].includes(rol);

const crear = asyncHandler(async(req, res) => {
    const usuario = await usuarioService.crearUsuario(req.body, req.usuario);
    return res.status(201).json(usuario);
});

const obtenerTodos = asyncHandler(async(req, res) => {
    const usuarios = req.query
        ? await usuarioService.obtenerTodos(req.usuario, req.query)
        : await usuarioService.obtenerTodos(req.usuario);
    return res.status(200).json(usuarios);
});

const obtenerPorId = asyncHandler(async(req, res) => {
    const idObjetivo = Number(req.params.id);

    if (req.usuario.id_usuario !== idObjetivo && !esRolElevado(req.usuario.rol)) {
        throw new AppError('No puedes consultar la información de otro usuario.', 403);
    }

    const usuario = await usuarioService.obtenerPorId(idObjetivo, req.usuario);
    return res.status(200).json(usuario);
});

const obtenerPorSucursal = asyncHandler(async(req, res) => {
    const usuarios = req.query
        ? await usuarioService.obtenerPorSucursal(Number(req.params.id_sucursal), req.usuario, req.query)
        : await usuarioService.obtenerPorSucursal(Number(req.params.id_sucursal), req.usuario);
    return res.status(200).json(usuarios);
});

const actualizar = asyncHandler(async(req, res) => {
    const usuario = await usuarioService.actualizarUsuario(
        Number(req.params.id),
        req.body,
        req.usuario,
    );
    return res.status(200).json(usuario);
});

const cambiarContrasena = asyncHandler(async(req, res) => {
    const idObjetivo = Number(req.params.id);
    if (req.usuario.rol !== 'dueno') {
        throw new AppError('Solo un dueño puede restablecer contraseñas.', 403);
    }

    const { contrasena_dueno, contrasena_nueva } = req.body;
    const resultado = await usuarioService.cambiarContrasena(idObjetivo, contrasena_dueno, contrasena_nueva, req.usuario);
    return res.status(200).json(resultado);
});

const cambiarEstado = asyncHandler(async(req, res) => {
    const { estado } = req.body;
    const usuario = await usuarioService.cambiarEstado(
        Number(req.params.id),
        estado,
        req.usuario,
    );
    return res.status(200).json(usuario);
});

const eliminar = asyncHandler(async(req, res) => {
    const resultado = await usuarioService.eliminarUsuario(
        Number(req.params.id),
        req.usuario,
    );
    return res.status(200).json(resultado);
});

module.exports = {
    crear,
    obtenerTodos,
    obtenerPorId,
    obtenerPorSucursal,
    actualizar,
    cambiarContrasena,
    cambiarEstado,
    eliminar,
};
