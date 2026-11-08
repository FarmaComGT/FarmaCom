const ProductoDAO = require('../daos/ProductoDAO');
const PresentacionDAO = require('../daos/PresentacionDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const BitacoraInventarioDAO = require('../daos/BitacoraInventarioDAO');
const AppError = require('../errors/AppError');
const { normalizarCodigoBarras } = require('../utils/codigoBarras');

const guardarProducto = async (operacion) => {
  try {
    return await operacion();
  } catch (error) {
    if (error.code === '23505' && ['uq_producto_codigo_barras', 'producto_codigo_barras_key'].includes(error.constraint)) {
      throw new AppError('El código de barras ya está asignado a otro producto.', 409);
    }
    throw error;
  }
};

// Helpers

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const normalizarConcentracion = (valor) => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') lanzarError('La concentración debe ser texto', 400);
  const concentracion = valor.trim();
  return concentracion || null;
};

const contieneCaracteresBuscables = (valor) => (
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .length > 0
);

const validarCasaActiva = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) lanzarError('La casa farmacéutica seleccionada no existe', 400);
  if (!casa.activo) lanzarError('No se puede asignar una casa farmacéutica inactiva', 409);
};

const validarProveedorActivo = async (id_proveedor) => {
  if (id_proveedor === null || id_proveedor === undefined || id_proveedor === '') return;
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) lanzarError('El proveedor seleccionado no existe', 400);
  if (!proveedor.activo) lanzarError('No se puede asignar un proveedor inactivo', 409);
};

// Operaciones

const crearProducto = async (datos, usuario = null) => {
  const {
    codigo, nombre_generico, concentracion, id_presentacion,
    meses_alerta_vencimiento,
  } = datos;

  if (!codigo || codigo.trim() === '')                   lanzarError('El código es requerido', 400);
  if (!nombre_generico || nombre_generico.trim() === '')  lanzarError('El nombre genérico es requerido', 400);
  if (meses_alerta_vencimiento <= 0)                      lanzarError('Los meses de alerta deben ser mayores a 0', 400);

  const presentacion = await PresentacionDAO.obtenerPorId(id_presentacion);
  if (!presentacion) lanzarError('La presentación seleccionada no existe', 400);

  await validarCasaActiva(datos.id_casa);
  await validarProveedorActivo(datos.id_proveedor);

  const existente = await ProductoDAO.obtenerPorCodigo(codigo);
  if (existente) lanzarError(`Ya existe un producto con el código "${codigo}"`, 409);

  const datosNormalizados = {
    ...datos,
    codigo_barras: normalizarCodigoBarras(datos.codigo_barras, { opcional: true }),
    concentracion: normalizarConcentracion(concentracion),
  };

  const duplicado = await ProductoDAO.obtenerPorIdentidad(datosNormalizados);
  if (duplicado) {
    lanzarError(
      `Ya existe "${duplicado.nombre_comercial}" de esa casa farmacéutica en presentación ${presentacion.nombre}`,
      409,
    );
  }

  const crearYAuditar = async (client = undefined) => {
    const creado = await guardarProducto(() => (client
      ? ProductoDAO.crear(datosNormalizados, client)
      : ProductoDAO.crear(datosNormalizados)));
    const producto = client
      ? await ProductoDAO.obtenerPorId(creado.id_producto, client)
      : await ProductoDAO.obtenerPorId(creado.id_producto);
    if (usuario?.id_usuario) {
      await BitacoraInventarioDAO.registrar({
        entidad: 'producto',
        id_entidad: producto.id_producto,
        accion: 'alta',
        id_producto: producto.id_producto,
        id_sucursal: usuario.id_sucursal ? Number(usuario.id_sucursal) : null,
        id_usuario: Number(usuario.id_usuario),
        nuevo: producto,
      }, client);
    }
    return producto;
  };

  return usuario?.id_usuario
    ? ProductoDAO.ejecutarEnTransaccion(crearYAuditar)
    : crearYAuditar();
};

const obtenerTodos = async () => {
  return await ProductoDAO.obtenerTodos();
};

const autocompletarParaPOS = async ({ busqueda, id_sucursal, limite = 10 }) => {
  const termino = typeof busqueda === 'string' ? busqueda.trim() : '';
  if (!termino) lanzarError('La busqueda es requerida', 400);
  if (!contieneCaracteresBuscables(termino)) {
    lanzarError('La busqueda debe incluir letras o numeros', 400);
  }
  if (!Number.isInteger(id_sucursal) || id_sucursal <= 0) {
    lanzarError('El usuario no tiene una sucursal valida asignada', 403);
  }

  const limiteNormalizado = limite === undefined ? 10 : Number(limite);
  if (!Number.isInteger(limiteNormalizado) || limiteNormalizado < 1 || limiteNormalizado > 20) {
    lanzarError('El limite debe ser un entero entre 1 y 20', 400);
  }

  return await ProductoDAO.autocompletarParaPOS(
    termino,
    id_sucursal,
    limiteNormalizado,
  );
};

const buscarPorLectura = async ({ codigo, id_sucursal }) => {
  const lectura = normalizarCodigoBarras(codigo);
  if (!Number.isInteger(id_sucursal) || id_sucursal <= 0) {
    lanzarError('El usuario no tiene una sucursal válida asignada.', 403);
  }
  const coincidencias = await ProductoDAO.obtenerPorCodigoLectura(lectura);
  if (!coincidencias.length) lanzarError('Código no registrado. Busca el producto por nombre o registra su código de barras.', 404);
  if (coincidencias.length !== 1) lanzarError('El código identifica más de un producto. Corrige los códigos del catálogo.', 409);
  if (!coincidencias[0].activo) lanzarError('El producto está inactivo.', 409);
  const lotes = await ProductoDAO.obtenerLotesParaLectura(coincidencias[0].id_producto, id_sucursal);
  if (!lotes.length) lanzarError('El producto no tiene lotes vendibles en esta sucursal. Revisa existencias, precios y vencimientos.', 409);
  return lotes;
};

const obtenerPorId = async (id_producto) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  return producto;
};

const actualizarProducto = async (id_producto, campos, usuario = null) => {
  const existente = await ProductoDAO.obtenerPorId(id_producto);
  if (!existente) lanzarError('Producto no encontrado', 404);

  if (campos.codigo && campos.codigo.toLowerCase() !== existente.codigo.toLowerCase()) {
    const duplicado = await ProductoDAO.obtenerPorCodigo(campos.codigo);
    if (duplicado) lanzarError(`Ya existe un producto con el código "${campos.codigo}"`, 409);
  }

  if (campos.id_presentacion !== undefined) {
    const presentacion = await PresentacionDAO.obtenerPorId(campos.id_presentacion);
    if (!presentacion) lanzarError('La presentación seleccionada no existe', 400);
  }

  if (
    campos.id_casa !== undefined
    && Number(campos.id_casa) !== Number(existente.id_casa)
  ) {
    await validarCasaActiva(campos.id_casa);
  }

  if (
    Object.prototype.hasOwnProperty.call(campos, 'id_proveedor')
    && campos.id_proveedor !== null
    && Number(campos.id_proveedor) !== Number(existente.id_proveedor)
  ) {
    await validarProveedorActivo(campos.id_proveedor);
  }

  if (campos.meses_alerta_vencimiento !== undefined && campos.meses_alerta_vencimiento <= 0) {
    lanzarError('Los meses de alerta deben ser mayores a 0', 400);
  }

  const datosNormalizados = { ...campos };
  if (Object.prototype.hasOwnProperty.call(campos, 'codigo_barras')) {
    datosNormalizados.codigo_barras = normalizarCodigoBarras(campos.codigo_barras, { opcional: true });
  }
  const actualizaConcentracion = Object.prototype.hasOwnProperty.call(campos, 'concentracion');
  if (actualizaConcentracion) {
    datosNormalizados.concentracion = normalizarConcentracion(campos.concentracion);
  }

  // La identidad se arma mezclando lo que llega con lo que ya está guardado,
  // porque el usuario puede estar cambiando solo uno de los cuatro campos.
  const identidad = {
    nombre_generico: datosNormalizados.nombre_generico ?? existente.nombre_generico,
    concentracion:   actualizaConcentracion
      ? datosNormalizados.concentracion
      : existente.concentracion,
    id_casa:         datosNormalizados.id_casa         ?? existente.id_casa,
    id_presentacion: datosNormalizados.id_presentacion ?? existente.id_presentacion,
  };

  const mismaIdentidad = await ProductoDAO.obtenerPorIdentidad(identidad);
  if (mismaIdentidad && mismaIdentidad.id_producto !== id_producto) {
    lanzarError('Ya existe otro producto con ese medicamento en esa misma presentación', 409);
  }

  const actualizarYAuditar = async (client = undefined) => {
    const anterior = client
      ? (await ProductoDAO.obtenerFilaPorId(id_producto, client, true) || existente)
      : existente;
    const actualizado = await guardarProducto(() => (client
      ? ProductoDAO.actualizar(id_producto, datosNormalizados, client)
      : ProductoDAO.actualizar(id_producto, datosNormalizados)));
    if (!actualizado) lanzarError('No se pudo actualizar el producto', 500);
    const producto = client
      ? await ProductoDAO.obtenerPorId(id_producto, client)
      : await ProductoDAO.obtenerPorId(id_producto);
    if (usuario?.id_usuario) {
      await BitacoraInventarioDAO.registrar({
        entidad: 'producto',
        id_entidad: id_producto,
        accion: 'modificacion',
        id_producto,
        id_sucursal: usuario.id_sucursal ? Number(usuario.id_sucursal) : null,
        id_usuario: Number(usuario.id_usuario),
        anterior,
        nuevo: producto,
      }, client);
    }
    return producto;
  };

  return usuario?.id_usuario
    ? ProductoDAO.ejecutarEnTransaccion(actualizarYAuditar)
    : actualizarYAuditar();
};

// Solo el dependiente puede usar este método 
const cambiarAplicaMayoreo = async (id_producto, aplica_mayoreo, usuario = null) => {
  const existente = await ProductoDAO.obtenerPorId(id_producto);
  if (!existente) lanzarError('Producto no encontrado', 404);

  const cambiarYAuditar = async (client = undefined) => {
    const anterior = client
      ? (await ProductoDAO.obtenerFilaPorId(id_producto, client, true) || existente)
      : existente;
    const actualizado = client
      ? await ProductoDAO.cambiarAplicaMayoreo(id_producto, aplica_mayoreo, client)
      : await ProductoDAO.cambiarAplicaMayoreo(id_producto, aplica_mayoreo);
    if (!actualizado) lanzarError('No se pudo actualizar el campo aplica_mayoreo', 500);
    const producto = client
      ? await ProductoDAO.obtenerPorId(id_producto, client)
      : await ProductoDAO.obtenerPorId(id_producto);
    if (usuario?.id_usuario) {
      await BitacoraInventarioDAO.registrar({
        entidad: 'producto',
        id_entidad: id_producto,
        accion: 'modificacion',
        id_producto,
        id_sucursal: usuario.id_sucursal ? Number(usuario.id_sucursal) : null,
        id_usuario: Number(usuario.id_usuario),
        anterior,
        nuevo: producto,
      }, client);
    }
    return {
      mensaje: `Mayoreo ${aplica_mayoreo ? 'activado' : 'desactivado'} correctamente`,
      producto,
    };
  };

  return usuario?.id_usuario
    ? ProductoDAO.ejecutarEnTransaccion(cambiarYAuditar)
    : cambiarYAuditar();
};

const cambiarEstadoProducto = async (id_producto, activo, usuario = null) => {
  const existente = await ProductoDAO.obtenerPorId(id_producto);
  if (!existente) lanzarError('Producto no encontrado', 404);
  if (Boolean(existente.activo) === activo) {
    lanzarError(`El producto ya está ${activo ? 'activo' : 'desactivado'}`, 409);
  }

  const cambiarYAuditar = async (client = undefined) => {
    const anterior = client
      ? (await ProductoDAO.obtenerFilaPorId(id_producto, client, true) || existente)
      : existente;
    const resultado = client
      ? await ProductoDAO.cambiarActivo(id_producto, activo, client)
      : await ProductoDAO.cambiarActivo(id_producto, activo);
    if (!resultado) lanzarError('No se pudo cambiar el estado del producto', 500);
    const producto = client
      ? await ProductoDAO.obtenerPorId(id_producto, client)
      : await ProductoDAO.obtenerPorId(id_producto);
    if (usuario?.id_usuario) {
      await BitacoraInventarioDAO.registrar({
        entidad: 'producto',
        id_entidad: id_producto,
        accion: 'cambio_estado',
        id_producto,
        id_sucursal: usuario.id_sucursal ? Number(usuario.id_sucursal) : null,
        id_usuario: Number(usuario.id_usuario),
        anterior,
        nuevo: producto,
      }, client);
    }
    return {
      mensaje: `Producto ${activo ? 'reactivado' : 'desactivado'} correctamente`,
      producto,
    };
  };

  return usuario?.id_usuario
    ? ProductoDAO.ejecutarEnTransaccion(cambiarYAuditar)
    : cambiarYAuditar();
};

const desactivarProducto = (id_producto, usuario = null) => (
  cambiarEstadoProducto(id_producto, false, usuario)
);

const reactivarProducto = (id_producto, usuario = null) => (
  cambiarEstadoProducto(id_producto, true, usuario)
);

module.exports = {
  buscarPorLectura,
  crearProducto,
  obtenerTodos,
  autocompletarParaPOS,
  obtenerPorId,
  actualizarProducto,
  cambiarAplicaMayoreo,
  desactivarProducto,
  reactivarProducto,
};
