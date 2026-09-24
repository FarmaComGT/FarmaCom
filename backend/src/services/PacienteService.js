const PacienteDAO = require('../daos/PacienteDAO');

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

const registrarPaciente = async ({
  id_laboratorio,
  nombre_paciente,
  dpi,
  fecha_nacimiento,
  telefono,
  direccion,
  observaciones,
}) => {
  const dpiNormalizado = normalizarDpi(dpi);
  if (dpiNormalizado) {
    const existente = await PacienteDAO.obtenerPorDpi(dpiNormalizado);
    if (existente) lanzarError('Ya existe un paciente con ese DPI', 409);
  }

  try {
    return await PacienteDAO.ejecutarEnTransaccion(async (client) => {
      const paciente = await PacienteDAO.crear(
        {
          id_laboratorio,
          nombre_paciente,
          dpi: dpiNormalizado,
          fecha_nacimiento,
          telefono,
          direccion,
          observaciones,
        },
        client,
      );
      const expediente = await PacienteDAO.crearExpediente(paciente.id_paciente, client);
      return { ...paciente, id_expediente: expediente.id_expediente };
    });
  } catch (error) {
    if (error.code === '23505') lanzarError('Ya existe un paciente con ese DPI', 409);
    throw error;
  }
};

const obtenerPorId = async (id_paciente) => {
  const paciente = await PacienteDAO.obtenerPorId(id_paciente);
  if (!paciente) throw noEncontrado();
  return paciente;
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
    datos,
    paginacion: {
      pagina: paginaAplicada,
      limite: limiteAplicado,
      total,
      total_paginas: Math.max(1, Math.ceil(total / limiteAplicado)),
    },
  };
};

const actualizarPaciente = async (id_paciente, campos) => {
  const existente = await PacienteDAO.obtenerPorId(id_paciente);
  if (!existente) throw noEncontrado();
  if (existente.estado === 'anulado') {
    lanzarError('No se puede editar un paciente anulado', 409);
  }

  const datos = { ...campos };
  if (Object.prototype.hasOwnProperty.call(datos, 'dpi')) {
    datos.dpi = normalizarDpi(datos.dpi);
    if (datos.dpi && datos.dpi !== existente.dpi) {
      const duplicado = await PacienteDAO.obtenerPorDpi(datos.dpi);
      if (duplicado && duplicado.id_paciente !== id_paciente) {
        lanzarError('Ya existe un paciente con ese DPI', 409);
      }
    }
  }

  let paciente;
  try {
    paciente = await PacienteDAO.actualizar(id_paciente, datos);
  } catch (error) {
    if (error.code === '23505') lanzarError('Ya existe un paciente con ese DPI', 409);
    throw error;
  }
  if (!paciente) throw noEncontrado();
  return paciente;
};

const anularPaciente = async (id_paciente, motivo_anulacion) => {
  return PacienteDAO.ejecutarEnTransaccion(async (client) => {
    const paciente = await PacienteDAO.obtenerParaActualizar(id_paciente, client);
    if (!paciente) throw noEncontrado();
    if (paciente.estado === 'anulado') {
      lanzarError('El paciente ya esta anulado', 409);
    }

    return PacienteDAO.anular(id_paciente, motivo_anulacion, client);
  });
};

module.exports = {
  registrarPaciente,
  obtenerPorId,
  buscarPacientes,
  actualizarPaciente,
  anularPaciente,
};
