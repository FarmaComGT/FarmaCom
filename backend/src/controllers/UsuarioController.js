const usuarioService = require('../services/UsuarioService');
const AppError = require('../errors/AppError');
const asyncHandler = require('../middlewares/asyncHandler');

const esRolElevado = (rol) => ['dueno', 'administrador'].includes(rol);

const crear = asyncHandler(async(req, res) => {
    const usuario = await usuarioService.crearUsuario(req.body);
    return res.status(201).json(usuario);
});

const obtenerTodos = asyncHandler(async(req, res) => {
    const usuarios = await usuarioService.obtenerTodos();
    return res.status(200).json(usuarios);
});

const obtenerPorId = asyncHandler(async(req, res) => {
    const idObjetivo = Number(req.params.id);

    if (req.usuario.id_usuario !== idObjetivo && !esRolElevado(req.usuario.rol)) {
        throw new AppError('No puedes consultar la información de otro usuario.', 403);
    }

    const usuario = await usuarioService.obtenerPorId(idObjetivo);
    return res.status(200).json(usuario);
});

const obtenerPorSucursal = asyncHandler(async(req, res) => {
    const usuarios = await usuarioService.obtenerPorSucursal(Number(req.params.id_sucursal));
    return res.status(200).json(usuarios);
});

const actualizar = asyncHandler(async(req, res) => {
    const usuario = await usuarioService.actualizarUsuario(Number(req.params.id), req.body);
    return res.status(200).json(usuario);
});

const cambiarContrasena = asyncHandler(async(req, res) => {
    const idObjetivo = Number(req.params.id);
    if (req.usuario.id_usuario !== idObjetivo) {
        throw new AppError('Solo puedes cambiar tu propia contraseña.', 403);
    }

    const { contrasena_actual, contrasena_nueva } = req.body;
    const resultado = await usuarioService.cambiarContrasena(idObjetivo, contrasena_actual, contrasena_nueva);
    return res.status(200).json(resultado);
});

const cambiarEstado = asyncHandler(async(req, res) => {
    const { estado } = req.body;
    const usuario = await usuarioService.cambiarEstado(Number(req.params.id), estado);
    return res.status(200).json(usuario);
});

const eliminar = asyncHandler(async(req, res) => {
    const resultado = await usuarioService.eliminarUsuario(Number(req.params.id));
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
