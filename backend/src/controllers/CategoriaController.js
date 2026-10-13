const categoriaService = require('../services/CategoriaService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
    const categoria = await categoriaService.crearCategoria(req.body);
    return res.status(201).json(categoria);
});

const obtenerTodas = asyncHandler(async (_req, res) => {
    const categorias = await categoriaService.obtenerTodas();
    return res.status(200).json(categorias);
});

const obtenerPorId = asyncHandler(async (req, res) => {
    const categoria = await categoriaService.obtenerPorId(Number(req.params.id));
    return res.status(200).json(categoria);
});

const actualizar = asyncHandler(async (req, res) => {
    const categoria = await categoriaService.actualizarCategoria(
        Number(req.params.id),
        req.body,
    );
    return res.status(200).json(categoria);
});

const eliminar = asyncHandler(async (req, res) => {
    const resultado = await categoriaService.eliminarCategoria(Number(req.params.id));
    return res.status(200).json(resultado);
});

module.exports = { crear, obtenerTodas, obtenerPorId, actualizar, eliminar };
