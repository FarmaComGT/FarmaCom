const CategoriaDAO = require('../daos/CategoriaDAO');
const AppError = require('../errors/AppError');

const crearCategoria = async({ nombre }) => {
    const existente = await CategoriaDAO.obtenerPorNombre(nombre);
    if (existente) {
        throw new AppError('Ya existe una categoría con ese nombre', 409);
    }

    return await CategoriaDAO.crear({ nombre });
};

const obtenerTodas = async() => {
    return await CategoriaDAO.obtenerTodos();
};

const obtenerPorId = async(id_categoria) => {
    const categoria = await CategoriaDAO.obtenerPorId(id_categoria);
    if (!categoria) {
        throw new AppError('Categoría no encontrada', 404);
    }
    return categoria;
};

const actualizarCategoria = async(id_categoria, campos) => {
    const existente = await CategoriaDAO.obtenerPorId(id_categoria);
    if (!existente) {
        throw new AppError('Categoría no encontrada', 404);
    }

    if (
        campos.nombre &&
        campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()
    ) {
        const duplicado = await CategoriaDAO.obtenerPorNombre(campos.nombre);
        if (duplicado) {
            throw new AppError('Ya existe una categoría con ese nombre', 409);
        }
    }

    return await CategoriaDAO.actualizar(id_categoria, campos);
};

const eliminarCategoria = async(id_categoria) => {
    const eliminado = await CategoriaDAO.eliminar(id_categoria);
    if (!eliminado) {
        throw new AppError('Categoría no encontrada', 404);
    }
    return { mensaje: 'Categoría eliminada correctamente' };
};

module.exports = {
    crearCategoria,
    obtenerTodas,
    obtenerPorId,
    actualizarCategoria,
    eliminarCategoria,
};
