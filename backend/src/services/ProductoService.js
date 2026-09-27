const ProductoDAO = require('../daos/ProductoDAO');
const PresentacionDAO = require('../daos/PresentacionDAO');

// Helpers

const lanzarError = (mensaje, status) => {
  const err = new Error(mensaje);
  err.status = status;
  throw err;
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

// Operaciones

const crearProducto = async (datos) => {
  const {
    codigo, nombre_generico, concentracion, id_presentacion,
    precio_compra, meses_alerta_vencimiento,
  } = datos;

  if (!codigo || codigo.trim() === '')                   lanzarError('El código es requerido', 400);
  if (!nombre_generico || nombre_generico.trim() === '')  lanzarError('El nombre genérico es requerido', 400);
  if (precio_compra < 0)                                  lanzarError('El precio de compra no puede ser negativo', 400);
  if (meses_alerta_vencimiento <= 0)                      lanzarError('Los meses de alerta deben ser mayores a 0', 400);

  const presentacion = await PresentacionDAO.obtenerPorId(id_presentacion);
  if (!presentacion) lanzarError('La presentación seleccionada no existe', 400);

  const existente = await ProductoDAO.obtenerPorCodigo(codigo);
  if (existente) lanzarError(`Ya existe un producto con el código "${codigo}"`, 409);

  const datosNormalizados = {
    ...datos,
    concentracion: normalizarConcentracion(concentracion),
  };

  const duplicado = await ProductoDAO.obtenerPorIdentidad(datosNormalizados);
  if (duplicado) {
    lanzarError(
      `Ya existe "${duplicado.nombre_comercial}" de esa casa farmacéutica en presentación ${presentacion.nombre}`,
      409,
    );
  }

  const creado = await ProductoDAO.crear(datosNormalizados);
  return await ProductoDAO.obtenerPorId(creado.id_producto);
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

const obtenerPorId = async (id_producto) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  return producto;
};

const actualizarProducto = async (id_producto, campos) => {
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

  if (campos.precio_compra !== undefined && campos.precio_compra < 0) {
    lanzarError('El precio de compra no puede ser negativo', 400);
  }

  if (campos.meses_alerta_vencimiento !== undefined && campos.meses_alerta_vencimiento <= 0) {
    lanzarError('Los meses de alerta deben ser mayores a 0', 400);
  }

  const datosNormalizados = { ...campos };
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

  const actualizado = await ProductoDAO.actualizar(id_producto, datosNormalizados);
  if (!actualizado) lanzarError('No se pudo actualizar el producto', 500);
  return await ProductoDAO.obtenerPorId(id_producto);
};

// Solo el dependiente puede usar este método 
const cambiarAplicaMayoreo = async (id_producto, aplica_mayoreo) => {
  const existente = await ProductoDAO.obtenerPorId(id_producto);
  if (!existente) lanzarError('Producto no encontrado', 404);

  const actualizado = await ProductoDAO.cambiarAplicaMayoreo(id_producto, aplica_mayoreo);
  if (!actualizado) lanzarError('No se pudo actualizar el campo aplica_mayoreo', 500);
  return {
    mensaje: `Mayoreo ${aplica_mayoreo ? 'activado' : 'desactivado'} correctamente`,
    producto: await ProductoDAO.obtenerPorId(id_producto),
  };
};

const desactivarProducto = async (id_producto) => {
  const existente = await ProductoDAO.obtenerPorId(id_producto);
  if (!existente)        lanzarError('Producto no encontrado', 404);
  if (!existente.activo) lanzarError('El producto ya está desactivado', 409);

  const resultado = await ProductoDAO.cambiarActivo(id_producto, false);
  if (!resultado) lanzarError('No se pudo desactivar el producto', 500);
  return {
    mensaje: 'Producto desactivado correctamente',
    producto: await ProductoDAO.obtenerPorId(id_producto),
  };
};

const reactivarProducto = async (id_producto) => {
  const existente = await ProductoDAO.obtenerPorId(id_producto);
  if (!existente)       lanzarError('Producto no encontrado', 404);
  if (existente.activo) lanzarError('El producto ya está activo', 409);

  const resultado = await ProductoDAO.cambiarActivo(id_producto, true);
  if (!resultado) lanzarError('No se pudo reactivar el producto', 500);
  return {
    mensaje: 'Producto reactivado correctamente',
    producto: await ProductoDAO.obtenerPorId(id_producto),
  };
};

module.exports = {
  crearProducto,
  obtenerTodos,
  autocompletarParaPOS,
  obtenerPorId,
  actualizarProducto,
  cambiarAplicaMayoreo,
  desactivarProducto,
  reactivarProducto,
};
