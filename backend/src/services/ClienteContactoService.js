const ClienteDAO = require('../daos/ClienteDAO');
const ClienteTelefonoDAO = require('../daos/ClienteTelefonoDAO');
const ClienteEmailDAO = require('../daos/ClienteEmailDAO');
const AppError = require('../errors/AppError');
const {
  normalizarTelefono,
  normalizarCorreo,
  esTelefonoValido,
  esCorreoValido,
} = require('../utils/contactoCliente');

const verificarCliente = async (idCliente) => {
  const cliente = await ClienteDAO.obtenerPorId(idCliente);
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
};

const crearServicioContacto = ({
  dao,
  columnaId,
  campo,
  nombre,
  normalizar,
  validar,
  mensajeInvalido,
  buscarEnCliente,
  mensajeDuplicado,
}) => {
  const prepararValor = (valor) => {
    const normalizado = normalizar(valor);
    if (!validar(normalizado)) throw new AppError(mensajeInvalido, 400);
    return normalizado;
  };

  // El contacto debe pertenecer al cliente indicado en la ruta.
  const obtenerDelCliente = async (idCliente, idContacto) => {
    const registro = await dao.obtenerPorId(idContacto);
    if (!registro || registro.id_cliente !== idCliente) {
      throw new AppError(`${nombre} no encontrado`, 404);
    }
    return registro;
  };

  const verificarDuplicado = async (idCliente, valor, idActual = null) => {
    const duplicado = await buscarEnCliente(idCliente, valor);
    if (duplicado && duplicado[columnaId] !== idActual) {
      throw new AppError(mensajeDuplicado, 409);
    }
  };

  // La base también protege la unicidad; cubre dos solicitudes simultáneas.
  const guardar = async (operacion) => {
    try {
      return await operacion();
    } catch (error) {
      if (error.code === '23505') throw new AppError(mensajeDuplicado, 409);
      throw error;
    }
  };

  const listar = async (idCliente) => {
    await verificarCliente(idCliente);
    return dao.obtenerPorCliente(idCliente);
  };

  const agregar = async (idCliente, valor) => {
    await verificarCliente(idCliente);
    const normalizado = prepararValor(valor);
    await verificarDuplicado(idCliente, normalizado);
    return guardar(() => dao.crear({ id_cliente: idCliente, [campo]: normalizado }));
  };

  const actualizar = async (idCliente, idContacto, valor) => {
    const existente = await obtenerDelCliente(idCliente, idContacto);
    const normalizado = prepararValor(valor);
    if (normalizado === existente[campo]) return existente;
    await verificarDuplicado(idCliente, normalizado, existente[columnaId]);
    return guardar(() => dao.actualizar(idContacto, { [campo]: normalizado }));
  };

  const eliminar = async (idCliente, idContacto) => {
    await obtenerDelCliente(idCliente, idContacto);
    await dao.eliminar(idContacto);
    return { mensaje: `${nombre} eliminado correctamente` };
  };

  return { listar, agregar, actualizar, eliminar };
};

const telefonos = crearServicioContacto({
  dao: ClienteTelefonoDAO,
  columnaId: 'id_telefono',
  campo: 'numero',
  nombre: 'Teléfono',
  normalizar: normalizarTelefono,
  validar: esTelefonoValido,
  mensajeInvalido: 'El teléfono debe tener entre 8 y 15 dígitos, con + opcional al inicio',
  buscarEnCliente: ClienteTelefonoDAO.obtenerPorClienteYNumero,
  mensajeDuplicado: 'El cliente ya tiene registrado ese teléfono',
});

const correos = crearServicioContacto({
  dao: ClienteEmailDAO,
  columnaId: 'id_email',
  campo: 'correo',
  nombre: 'Correo',
  normalizar: normalizarCorreo,
  validar: esCorreoValido,
  mensajeInvalido: 'El correo no tiene un formato válido',
  buscarEnCliente: ClienteEmailDAO.obtenerPorClienteYCorreo,
  mensajeDuplicado: 'El cliente ya tiene registrado ese correo',
});

module.exports = {
  listarTelefonos: telefonos.listar,
  agregarTelefono: telefonos.agregar,
  actualizarTelefono: telefonos.actualizar,
  eliminarTelefono: telefonos.eliminar,
  listarCorreos: correos.listar,
  agregarCorreo: correos.agregar,
  actualizarCorreo: correos.actualizar,
  eliminarCorreo: correos.eliminar,
};
