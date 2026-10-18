jest.mock('../daos/PacienteDAO');
jest.mock('./BitacoraLaboratorioService');

const PacienteDAO = require('../daos/PacienteDAO');
const BitacoraLaboratorioService = require('./BitacoraLaboratorioService');
const PacienteService = require('./PacienteService');

const mockClient = {};
const usuarioAdministrador = { id_usuario: 9, rol: 'administrador', id_laboratorio: null };
const usuarioLaboratorio1 = { id_usuario: 10, rol: 'laboratorista', id_laboratorio: 1 };

describe('PacienteService - edad calculada', () => {
  it('calcula la edad a partir de fecha_nacimiento cuando está presente', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue({
      id_paciente: 1,
      fecha_nacimiento: '1990-01-01',
      edad_manual: null,
    });

    const paciente = await PacienteService.obtenerPorId(1, usuarioAdministrador);

    expect(paciente.edad).toBeGreaterThan(30);
  });

  it('usa edad_manual cuando no hay fecha_nacimiento', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue({
      id_paciente: 2,
      fecha_nacimiento: null,
      edad_manual: 52,
    });

    const paciente = await PacienteService.obtenerPorId(2, usuarioAdministrador);

    expect(paciente.edad).toBe(52);
  });

  it('lanza 404 si el paciente no existe', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue(null);

    await expect(PacienteService.obtenerPorId(99, usuarioAdministrador)).rejects.toMatchObject({ status: 404 });
  });
});

describe('PacienteService.registrarPaciente - nombre duplicado', () => {
  it('lanza 409 si ya existe un paciente con ese nombre', async () => {
    PacienteDAO.obtenerPorNombre.mockResolvedValue({ id_paciente: 1, nombre_paciente: 'Juan Pérez' });

    await expect(
      PacienteService.registrarPaciente({ nombre_paciente: 'juan pérez', edad_manual: 30 }, usuarioAdministrador),
    ).rejects.toMatchObject({ status: 409 });

    expect(PacienteDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
  });

  it('distingue el mensaje de nombre duplicado del de DPI duplicado en condicion de carrera', async () => {
    PacienteDAO.obtenerPorNombre.mockResolvedValue(null);
    PacienteDAO.obtenerPorDpi.mockResolvedValue(null);
    const errorConstraint = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'uq_paciente_nombre',
    });
    PacienteDAO.ejecutarEnTransaccion.mockRejectedValue(errorConstraint);

    await expect(
      PacienteService.registrarPaciente(
        { nombre_paciente: 'Juan Pérez', dpi: '123', edad_manual: 30 },
        usuarioAdministrador,
      ),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('nombre') });
  });

  it('registra el paciente y su expediente dentro de la transacción', async () => {
    PacienteDAO.obtenerPorNombre.mockResolvedValue(null);
    PacienteDAO.obtenerPorDpi.mockResolvedValue(null);
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.crear.mockResolvedValue({ id_paciente: 1, nombre_paciente: 'Juan Pérez', edad_manual: 30 });
    PacienteDAO.crearExpediente.mockResolvedValue({ id_expediente: 10 });

    const resultado = await PacienteService.registrarPaciente(
      { nombre_paciente: 'Juan Pérez', edad_manual: 30 }, usuarioAdministrador,
    );

    expect(resultado.id_expediente).toBe(10);
    expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledTimes(2);
  });
});

describe('PacienteService.buscarPacientes', () => {
  it('aplica paginación por defecto y calcula el total de páginas', async () => {
    PacienteDAO.buscar.mockResolvedValue({
      datos: [{ id_paciente: 1, edad_manual: 30, fecha_nacimiento: null }],
      total: 25,
    });

    const resultado = await PacienteService.buscarPacientes(
      { id_laboratorio: 1 },
      usuarioAdministrador,
    );

    expect(PacienteDAO.buscar).toHaveBeenCalledWith({
      id_laboratorio: 1, busqueda: null, estado: null, pagina: 1, limite: 20,
    });
    expect(resultado.paginacion).toEqual({ pagina: 1, limite: 20, total: 25, total_paginas: 2 });
  });
});

describe('PacienteService.actualizarPaciente', () => {
  const existente = {
    id_paciente: 1, estado: 'activo', dpi: '111', nombre_paciente: 'Juan Pérez',
  };

  beforeEach(() => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
  });

  it('lanza 404 si el paciente no existe', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(null);

    await expect(
      PacienteService.actualizarPaciente(99, {}, usuarioAdministrador),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 409 si el paciente ya está anulado', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({ ...existente, estado: 'anulado' });

    await expect(
      PacienteService.actualizarPaciente(1, { telefono: '123' }, usuarioAdministrador),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lanza 409 si el nuevo DPI ya pertenece a otro paciente', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(existente);
    PacienteDAO.obtenerPorDpi.mockResolvedValue({ id_paciente: 2 });

    await expect(
      PacienteService.actualizarPaciente(1, { dpi: '222' }, usuarioAdministrador),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lanza 409 si el nuevo nombre ya pertenece a otro paciente', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(existente);
    PacienteDAO.obtenerPorNombre.mockResolvedValue({ id_paciente: 2 });

    await expect(
      PacienteService.actualizarPaciente(1, { nombre_paciente: 'Ana López' }, usuarioAdministrador),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('actualiza correctamente y registra el cambio en bitácora', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(existente);
    PacienteDAO.actualizar.mockResolvedValue({ ...existente, telefono: '123' });

    const resultado = await PacienteService.actualizarPaciente(
      1,
      { telefono: '123' },
      usuarioAdministrador,
    );

    expect(resultado.telefono).toBe('123');
    expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'actualizar' }),
      mockClient,
    );
  });
});

describe('PacienteService.anularPaciente', () => {
  it('lanza 404 si el paciente no existe', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(null);

    await expect(
      PacienteService.anularPaciente(99, 'Duplicado', usuarioAdministrador),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 409 si el paciente ya está anulado', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({ id_paciente: 1, estado: 'anulado' });

    await expect(
      PacienteService.anularPaciente(1, 'Duplicado', usuarioAdministrador),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('anula correctamente y registra el cambio en bitácora', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({ id_paciente: 1, estado: 'activo' });
    PacienteDAO.anular.mockResolvedValue({ id_paciente: 1, estado: 'anulado' });

    const resultado = await PacienteService.anularPaciente(1, 'Duplicado', usuarioAdministrador);

    expect(resultado.estado).toBe('anulado');
    expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'anular' }),
      mockClient,
    );
  });
});

describe('PacienteService - aislamiento por laboratorio', () => {
  it('impide registrar pacientes en otro laboratorio', async () => {
    await expect(PacienteService.registrarPaciente({
      id_laboratorio: 2,
      nombre_paciente: 'Paciente ajeno',
      edad_manual: 30,
    }, usuarioLaboratorio1)).rejects.toMatchObject({ status: 403 });

    expect(PacienteDAO.obtenerPorNombre).not.toHaveBeenCalled();
    expect(PacienteDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
  });

  it('impide buscar pacientes de otro laboratorio', async () => {
    await expect(PacienteService.buscarPacientes(
      { id_laboratorio: 2 },
      usuarioLaboratorio1,
    )).rejects.toMatchObject({ status: 403 });

    expect(PacienteDAO.buscar).not.toHaveBeenCalled();
  });

  it('impide consultar por id un paciente de otro laboratorio', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue({ id_paciente: 20, id_laboratorio: 2 });

    await expect(PacienteService.obtenerPorId(20, usuarioLaboratorio1))
      .rejects.toMatchObject({ status: 403 });
  });

  it('impide modificar un paciente de otro laboratorio', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({
      id_paciente: 20,
      id_laboratorio: 2,
      estado: 'activo',
    });

    await expect(PacienteService.actualizarPaciente(
      20,
      { telefono: '5555-0000' },
      usuarioLaboratorio1,
    )).rejects.toMatchObject({ status: 403 });

    expect(PacienteDAO.actualizar).not.toHaveBeenCalled();
  });

  it('impide anular un paciente de otro laboratorio', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({
      id_paciente: 20,
      id_laboratorio: 2,
      estado: 'activo',
    });

    await expect(PacienteService.anularPaciente(
      20,
      'Solicitud incorrecta',
      usuarioLaboratorio1,
    )).rejects.toMatchObject({ status: 403 });

    expect(PacienteDAO.anular).not.toHaveBeenCalled();
  });
});
