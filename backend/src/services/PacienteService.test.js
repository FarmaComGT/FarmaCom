jest.mock('../daos/PacienteDAO');
jest.mock('./BitacoraLaboratorioService');

const PacienteDAO = require('../daos/PacienteDAO');
const BitacoraLaboratorioService = require('./BitacoraLaboratorioService');
const PacienteService = require('./PacienteService');

const mockClient = {};

describe('PacienteService - edad calculada', () => {
  it('calcula la edad a partir de fecha_nacimiento cuando está presente', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue({
      id_paciente: 1,
      fecha_nacimiento: '1990-01-01',
      edad_manual: null,
    });

    const paciente = await PacienteService.obtenerPorId(1);

    expect(paciente.edad).toBeGreaterThan(30);
  });

  it('usa edad_manual cuando no hay fecha_nacimiento', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue({
      id_paciente: 2,
      fecha_nacimiento: null,
      edad_manual: 52,
    });

    const paciente = await PacienteService.obtenerPorId(2);

    expect(paciente.edad).toBe(52);
  });

  it('lanza 404 si el paciente no existe', async () => {
    PacienteDAO.obtenerPorId.mockResolvedValue(null);

    await expect(PacienteService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('PacienteService.registrarPaciente - nombre duplicado', () => {
  it('lanza 409 si ya existe un paciente con ese nombre', async () => {
    PacienteDAO.obtenerPorNombre.mockResolvedValue({ id_paciente: 1, nombre_paciente: 'Juan Pérez' });

    await expect(
      PacienteService.registrarPaciente({ nombre_paciente: 'juan pérez', edad_manual: 30 }, 9),
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
      PacienteService.registrarPaciente({ nombre_paciente: 'Juan Pérez', dpi: '123', edad_manual: 30 }, 9),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('nombre') });
  });

  it('registra el paciente y su expediente dentro de la transacción', async () => {
    PacienteDAO.obtenerPorNombre.mockResolvedValue(null);
    PacienteDAO.obtenerPorDpi.mockResolvedValue(null);
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.crear.mockResolvedValue({ id_paciente: 1, nombre_paciente: 'Juan Pérez', edad_manual: 30 });
    PacienteDAO.crearExpediente.mockResolvedValue({ id_expediente: 10 });

    const resultado = await PacienteService.registrarPaciente(
      { nombre_paciente: 'Juan Pérez', edad_manual: 30 }, 9,
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

    const resultado = await PacienteService.buscarPacientes({ id_laboratorio: 1 });

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
      PacienteService.actualizarPaciente(99, {}, 9),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 409 si el paciente ya está anulado', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({ ...existente, estado: 'anulado' });

    await expect(
      PacienteService.actualizarPaciente(1, { telefono: '123' }, 9),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lanza 409 si el nuevo DPI ya pertenece a otro paciente', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(existente);
    PacienteDAO.obtenerPorDpi.mockResolvedValue({ id_paciente: 2 });

    await expect(
      PacienteService.actualizarPaciente(1, { dpi: '222' }, 9),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lanza 409 si el nuevo nombre ya pertenece a otro paciente', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(existente);
    PacienteDAO.obtenerPorNombre.mockResolvedValue({ id_paciente: 2 });

    await expect(
      PacienteService.actualizarPaciente(1, { nombre_paciente: 'Ana López' }, 9),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('actualiza correctamente y registra el cambio en bitácora', async () => {
    PacienteDAO.obtenerParaActualizar.mockResolvedValue(existente);
    PacienteDAO.actualizar.mockResolvedValue({ ...existente, telefono: '123' });

    const resultado = await PacienteService.actualizarPaciente(1, { telefono: '123' }, 9);

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
      PacienteService.anularPaciente(99, 'Duplicado', 9),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 409 si el paciente ya está anulado', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({ id_paciente: 1, estado: 'anulado' });

    await expect(
      PacienteService.anularPaciente(1, 'Duplicado', 9),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('anula correctamente y registra el cambio en bitácora', async () => {
    PacienteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    PacienteDAO.obtenerParaActualizar.mockResolvedValue({ id_paciente: 1, estado: 'activo' });
    PacienteDAO.anular.mockResolvedValue({ id_paciente: 1, estado: 'anulado' });

    const resultado = await PacienteService.anularPaciente(1, 'Duplicado', 9);

    expect(resultado.estado).toBe('anulado');
    expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'anular' }),
      mockClient,
    );
  });
});
