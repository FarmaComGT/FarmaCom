const ClienteDAO = require('../daos/ClienteDAO');
const AppError = require('../errors/AppError');

const noEncontrado = () => new AppError('Cliente no encontrado', 404);

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const normalizarNit = (nit) => {
  if (nit == null) return null;
  const normalizado = String(nit).trim().toUpperCase().replace(/\s+/g, '');
  return normalizado || null;
};

const crearCliente = async ({ nombre_cliente, nit, observaciones }) => {
  const nitNormalizado = normalizarNit(nit);
  if (nitNormalizado) {
    const existente = await ClienteDAO.obtenerPorNit(nitNormalizado);
    if (existente) lanzarError('Ya existe un cliente con ese NIT', 409);
  }

  try {
    return await ClienteDAO.crear({
      nombre_cliente,
      nit: nitNormalizado,
      observaciones,
    });
  } catch (error) {
    if (error.code === '23505') lanzarError('Ya existe un cliente con ese NIT', 409);
    throw error;
  }
};

const obtenerTodos = () => ClienteDAO.obtenerTodos();

const obtenerPorId = async (id_cliente) => {
  const cliente = await ClienteDAO.obtenerPorId(id_cliente);
  if (!cliente) throw noEncontrado();
  return cliente;
};

const actualizarCliente = async (id_cliente, campos) => {
  const existente = await ClienteDAO.obtenerPorId(id_cliente);
  if (!existente) throw noEncontrado();

  const datos = { ...campos };
  if (Object.prototype.hasOwnProperty.call(datos, 'nit')) {
    datos.nit = normalizarNit(datos.nit);
    if (datos.nit && datos.nit !== existente.nit) {
      const duplicado = await ClienteDAO.obtenerPorNit(datos.nit);
      if (duplicado && duplicado.id_cliente !== id_cliente) {
        lanzarError('Ya existe un cliente con ese NIT', 409);
      }
    }
  }

  let cliente;
  try {
    cliente = await ClienteDAO.actualizar(id_cliente, datos);
  } catch (error) {
    if (error.code === '23505') lanzarError('Ya existe un cliente con ese NIT', 409);
    throw error;
  }
  if (!cliente) throw noEncontrado();
  return cliente;
};

const eliminarCliente = async (id_cliente) => {
  const cliente = await ClienteDAO.eliminar(id_cliente);
  if (!cliente) throw noEncontrado();
  return { mensaje: 'Cliente eliminado correctamente' };
};

module.exports = { crearCliente, obtenerTodos, obtenerPorId, actualizarCliente, eliminarCliente };
