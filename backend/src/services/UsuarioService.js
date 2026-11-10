const bcrypt = require('bcrypt');
const UsuarioDAO = require('../daos/UsuarioDAO');
const LaboratorioDAO = require('../daos/LaboratorioDAO');
const AppError = require('../errors/AppError');
const { completarPaginacion } = require('../validators/paginacionValidators');

const SALT_ROUNDS = 10;
const ROLES_GESTIONABLES_POR_ADMIN = new Set(['dependiente', 'laboratorista']);

const sinHash = (usuario) => {
    if (!usuario) return usuario;
    const { contrasena_hash, ...seguro } = usuario;
    return seguro;
};

const exigirDueno = (actor) => {
    if (actor?.rol !== 'dueno') {
        throw new AppError('Solo un dueño puede realizar esta operación', 403);
    }
};

const autorizarConsulta = (actor, objetivo) => {
    if (!actor) throw new AppError('No autenticado', 401);
    if (actor.rol === 'dueno' || Number(actor.id_usuario) === Number(objetivo.id_usuario)) return;
    if (
        actor.rol === 'administrador'
        && Number(actor.id_sucursal) === Number(objetivo.id_sucursal)
    ) return;
    throw new AppError('No puedes consultar cuentas fuera de tus permisos', 403);
};

const autorizarActualizacion = (actor, objetivo, campos) => {
    if (!actor) throw new AppError('No autenticado', 401);
    if (actor.rol === 'dueno') return;
    if (actor.rol !== 'administrador') {
        throw new AppError('No tienes permiso para modificar usuarios', 403);
    }
    if (Number(actor.id_sucursal) !== Number(objetivo.id_sucursal)) {
        throw new AppError('No puedes modificar cuentas de otra sucursal', 403);
    }

    const esPropia = Number(actor.id_usuario) === Number(objetivo.id_usuario);
    if (objetivo.rol === 'dueno' || (objetivo.rol === 'administrador' && !esPropia)) {
        throw new AppError('No puedes modificar una cuenta con permisos iguales o superiores', 403);
    }

    const sucursalFinal = Number(campos.id_sucursal ?? objetivo.id_sucursal);
    if (sucursalFinal !== Number(actor.id_sucursal)) {
        throw new AppError('No puedes asignar cuentas a otra sucursal', 403);
    }

    if (campos.rol !== undefined) {
        const rolFinal = campos.rol;
        const mantieneRolPropio = esPropia
            && objetivo.rol === 'administrador'
            && rolFinal === 'administrador';
        if (!mantieneRolPropio && !ROLES_GESTIONABLES_POR_ADMIN.has(rolFinal)) {
            throw new AppError('Un administrador no puede asignar roles elevados', 403);
        }
        if (esPropia && rolFinal !== 'administrador') {
            throw new AppError('Un administrador no puede cambiar su propio rol', 403);
        }
    }
};

const protegerUltimoDuenoActivo = async (objetivo, dejaDeSerDuenoActivo, client) => {
    if (
        objetivo.rol !== 'dueno'
        || objetivo.estado_usuario !== 'activo'
        || !dejaDeSerDuenoActivo
    ) return;

    await UsuarioDAO.bloquearProteccionDuenos(client);
    const total = await UsuarioDAO.contarDuenosActivos(client);
    if (total <= 1) {
        throw new AppError(
            'Debe permanecer al menos un dueño activo en el sistema',
            409,
        );
    }
};

const resolverLaboratorio = async(rol, id_laboratorio) => {
    if (rol !== 'laboratorista') {
        return null;
    }

    const id = Number(id_laboratorio);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError('Un laboratorista debe tener un laboratorio asignado', 400);
    }

    const laboratorio = await LaboratorioDAO.obtenerPorId(id);
    if (!laboratorio || !laboratorio.activo) {
        throw new AppError('Laboratorio no encontrado o inactivo', 400);
    }

    return id;
};

const crearUsuario = async({ id_sucursal, id_laboratorio, nombre_usuario, correo_usuario, contrasena, rol }, actor) => {
    exigirDueno(actor);
    const existente = await UsuarioDAO.obtenerPorCorreo(correo_usuario);
    if (existente) {
        throw new AppError('El correo ya está registrado', 409);
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

    return sinHash(usuario);
};

const sanitizarListado = (resultado) => (Array.isArray(resultado)
    ? resultado.map(sinHash)
    : { ...resultado, datos: resultado.datos.map(sinHash) });

const obtenerTodos = async(actor, filtros = {}) => {
    if (!actor) throw new AppError('No autenticado', 401);
    const consulta = completarPaginacion(filtros);
    const usuarios = actor.rol === 'administrador'
        ? await UsuarioDAO.obtenerPorSucursal(actor.id_sucursal, consulta)
        : await UsuarioDAO.obtenerTodos(consulta);
    return sanitizarListado(usuarios);
};

const obtenerPorId = async(id_usuario, actor) => {
    const usuario = await UsuarioDAO.obtenerPorId(id_usuario);
    if (!usuario) {
        throw new AppError('Usuario no encontrado', 404);
    }
    autorizarConsulta(actor, usuario);
    return sinHash(usuario);
};

const obtenerPorSucursal = async(id_sucursal, actor, filtros = {}) => {
    if (
        actor?.rol !== 'dueno'
        && !(
            actor?.rol === 'administrador'
            && Number(actor.id_sucursal) === Number(id_sucursal)
        )
    ) {
        throw new AppError('No puedes consultar cuentas de otra sucursal', 403);
    }
    const usuarios = await UsuarioDAO.obtenerPorSucursal(
        id_sucursal,
        completarPaginacion(filtros),
    );
    return sanitizarListado(usuarios);
};

const actualizarUsuario = async(id_usuario, campos, actor) => (
  UsuarioDAO.ejecutarEnTransaccion(async (client) => {
    const existente = await UsuarioDAO.obtenerParaActualizar(id_usuario, client);
    if (!existente) throw new AppError('Usuario no encontrado', 404);
    autorizarActualizacion(actor, existente, campos);

    if (campos.correo_usuario && campos.correo_usuario !== existente.correo_usuario) {
        const conMismoCorreo = await UsuarioDAO.obtenerPorCorreo(campos.correo_usuario, client);
        if (conMismoCorreo) {
            throw new AppError('El correo ya está en uso por otro usuario', 409);
        }
    }

    const rolFinal = campos.rol ?? existente.rol;
    await protegerUltimoDuenoActivo(
        existente,
        rolFinal !== 'dueno',
        client,
    );
    const laboratorioSolicitado = Object.prototype.hasOwnProperty.call(campos, 'id_laboratorio')
        ? campos.id_laboratorio
        : existente.id_laboratorio;
    const id_laboratorio = await resolverLaboratorio(rolFinal, laboratorioSolicitado);

    const usuario = await UsuarioDAO.actualizar(id_usuario, {
        ...campos,
        rol: rolFinal,
        id_laboratorio,
    }, client);
    return sinHash(usuario);
  })
);

const cambiarContrasena = async(id_usuario, contrasena_dueno, contrasena_nueva, actor) => {
    exigirDueno(actor);
    const dueno = await UsuarioDAO.obtenerPorId(actor.id_usuario);
    if (!dueno || dueno.rol !== 'dueno' || dueno.estado_usuario !== 'activo') {
        throw new AppError('No tienes permiso para restablecer contraseñas.', 403);
    }
    const esValida = await bcrypt.compare(contrasena_dueno, dueno.contrasena_hash);
    if (!esValida) {
        // 403 evita confundir una reautenticación fallida con una sesión expirada.
        throw new AppError('Tu contraseña de dueño es incorrecta.', 403);
    }
    const nueva_hash = await bcrypt.hash(contrasena_nueva, SALT_ROUNDS);
    return UsuarioDAO.ejecutarEnTransaccion(async (client) => {
        const usuario = await UsuarioDAO.obtenerParaActualizar(id_usuario, client);
        if (!usuario) throw new AppError('Usuario no encontrado', 404);
        await UsuarioDAO.actualizarContrasena(id_usuario, nueva_hash, client);
        await UsuarioDAO.incrementarTokenVersion(id_usuario, client);
        return { mensaje: 'Contraseña restablecida correctamente.' };
    });
};

const cambiarEstado = async(id_usuario, nuevo_estado, actor) => {
    exigirDueno(actor);
    return UsuarioDAO.ejecutarEnTransaccion(async (client) => {
        const existente = await UsuarioDAO.obtenerParaActualizar(id_usuario, client);
        if (!existente) throw new AppError('Usuario no encontrado', 404);
        await protegerUltimoDuenoActivo(
            existente,
            nuevo_estado !== 'activo',
            client,
        );
        return sinHash(await UsuarioDAO.cambiarEstado(id_usuario, nuevo_estado, client));
    });
};

const eliminarUsuario = async(id_usuario, actor) => {
    exigirDueno(actor);
    return UsuarioDAO.ejecutarEnTransaccion(async (client) => {
        const existente = await UsuarioDAO.obtenerParaActualizar(id_usuario, client);
        if (!existente) throw new AppError('Usuario no encontrado', 404);
        await protegerUltimoDuenoActivo(existente, true, client);
        try {
            await UsuarioDAO.eliminar(id_usuario, client);
        } catch (error) {
            if (error.code === '23503') {
                throw new AppError(
                    'No se puede eliminar una cuenta con actividad registrada; desactívala en su lugar',
                    409,
                );
            }
            throw error;
        }
        return { mensaje: 'Usuario eliminado correctamente' };
    });
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
