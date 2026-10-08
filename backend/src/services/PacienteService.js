const BitacoraLaboratorioService = require('./BitacoraLaboratorioService');
const PacienteDAO = require('../daos/PacienteDAO');
const { calcularEdad } = require('../utils/edad');

const noEncontrado = () => {
  const error = new Error('Paciente no encontrado');
  error.status = 404;
  return error;
};

const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const normalizarDpi = (dpi) => {
  if (dpi == null) return null;
  const normalizado = String(dpi).trim().replace(/\s+/g, '');
  return normalizado || null;
};

const conEdad = (paciente) => (
  paciente ? { ...paciente, edad: paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : paciente.edad_manual } : paciente
);

const registrarPaciente = async ({
  id_laboratorio,
  nombre_paciente,
  dpi,
  fecha_nacimiento,
  edad_manual,
  sexo,
  telefono,
  direccion,
  observaciones,
}, id_usuario) => {
  const dpiNormalizado = normalizarDpi(dpi);
  if (dpiNormalizado) {
    const existente = await PacienteDAO.obtenerPorDpi(dpiNormalizado);
    if (existente) lanzarError('Ya existe un paciente con ese DPI', 409);
  }

  const existentePorNombre = await PacienteDAO.obtenerPorNombre(nombre_paciente);
  if (existentePorNombre) {
    lanzarError('Ya existe un paciente con ese nombre. Ingresa el nombre completo (o un apellido adicional) para diferenciarlo.', 409);
  }

  try {
    return await PacienteDAO.ejecutarEnTransaccion(async (client) => {
      const paciente = await PacienteDAO.crear(
        {
          id_laboratorio,
          nombre_paciente,
          dpi: dpiNormalizado,
          fecha_nacimiento,
          edad_manual,
          sexo,
          telefono,
          direccion,
          observaciones,
        },
        client,
      );
      const expediente = await PacienteDAO.crearExpediente(paciente.id_paciente, client);
      await BitacoraLaboratorioService.registrarCambio({
        id_usuario, entidad: 'paciente', id_entidad: paciente.id_paciente,
        accion: 'crear', nuevo: paciente,
      }, client);
      await BitacoraLaboratorioService.registrarCambio({
        id_usuario, entidad: 'expediente_laboratorio', id_entidad: expediente.id_expediente,
        accion: 'crear', nuevo: expediente,
      }, client);
      return conEdad({ ...paciente, id_expediente: expediente.id_expediente });
    });
  } catch (error) {
    if (error.code === '23505') {
      if (error.constraint === 'uq_paciente_nombre') {
        lanzarError('Ya existe un paciente con ese nombre. Ingresa el nombre completo (o un apellido adicional) para diferenciarlo.', 409);
      }
      lanzarError('Ya existe un paciente con ese DPI', 409);
    }
    throw error;
  }
};

const obtenerPorId = async (id_paciente) => {
  const paciente = await PacienteDAO.obtenerPorId(id_paciente);
  if (!paciente) throw noEncontrado();
  return conEdad(paciente);
};

const buscarPacientes = async ({ id_laboratorio, busqueda, estado, pagina, limite }) => {
  const paginaAplicada = pagina ?? 1;
  const limiteAplicado = limite ?? 20;

  const { datos, total } = await PacienteDAO.buscar({
    id_laboratorio,
    busqueda: busqueda?.trim() || null,
    estado: estado || null,
    pagina: paginaAplicada,
    limite: limiteAplicado,
  });

  return {
    datos: datos.map(conEdad),
    paginacion: {
      pagina: paginaAplicada,
      limite: limiteAplicado,
      total,
      total_paginas: Math.max(1, Math.ceil(total / limiteAplicado)),
    },
  };
};

const actualizarPaciente = async (id_paciente, campos, id_usuario) => {
  try {
    return await PacienteDAO.ejecutarEnTransaccion(async (client) => {
      const existente = await PacienteDAO.obtenerParaActualizar(id_paciente, client);
      if (!existente) throw noEncontrado();
      if (existente.estado === 'anulado') {
        lanzarError('No se puede editar un paciente anulado', 409);
      }
      const datos = { ...campos };
      if (Object.prototype.hasOwnProperty.call(datos, 'dpi')) {
        datos.dpi = normalizarDpi(datos.dpi);
        if (datos.dpi && datos.dpi !== existente.dpi) {
          const duplicado = await PacienteDAO.obtenerPorDpi(datos.dpi, client);
          if (duplicado && duplicado.id_paciente !== id_paciente) {
            lanzarError('Ya existe un paciente con ese DPI', 409);
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(datos, 'nombre_paciente')
        && datos.nombre_paciente.trim().toLowerCase() !== existente.nombre_paciente.trim().toLowerCase()) {
        const duplicadoNombre = await PacienteDAO.obtenerPorNombre(datos.nombre_paciente, client);
        if (duplicadoNombre && duplicadoNombre.id_paciente !== id_paciente) {
          lanzarError('Ya existe un paciente con ese nombre. Ingresa el nombre completo (o un apellido adicional) para diferenciarlo.', 409);
        }
      }
      const paciente = await PacienteDAO.actualizar(id_paciente, datos, client);
      if (!paciente) throw noEncontrado();
      await BitacoraLaboratorioService.registrarCambio({
        id_usuario, entidad: 'paciente', id_entidad: id_paciente,
        accion: 'actualizar', anterior: existente, nuevo: paciente,
      }, client);
      return conEdad(paciente);
    });
  } catch (error) {
    if (error.code === '23505') {
      if (error.constraint === 'uq_paciente_nombre') {
        lanzarError('Ya existe un paciente con ese nombre. Ingresa el nombre completo (o un apellido adicional) para diferenciarlo.', 409);
      }
      lanzarError('Ya existe un paciente con ese DPI', 409);
    }
    throw error;
  }
};

const anularPaciente = async (id_paciente, motivo_anulacion, id_usuario) => {
  return PacienteDAO.ejecutarEnTransaccion(async (client) => {
    const paciente = await PacienteDAO.obtenerParaActualizar(id_paciente, client);
    if (!paciente) throw noEncontrado();
    if (paciente.estado === 'anulado') {
      lanzarError('El paciente ya esta anulado', 409);
    }

    const actualizado = await PacienteDAO.anular(id_paciente, motivo_anulacion, client);
    await BitacoraLaboratorioService.registrarCambio({
      id_usuario, entidad: 'paciente', id_entidad: id_paciente,
      accion: 'anular', anterior: paciente, nuevo: actualizado,
    }, client);
    return conEdad(actualizado);
  });
};

module.exports = {
  registrarPaciente,
  obtenerPorId,
  buscarPacientes,
  actualizarPaciente,
  anularPaciente,
};
