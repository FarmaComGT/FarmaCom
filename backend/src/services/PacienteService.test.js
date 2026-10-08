jest.mock('../daos/PacienteDAO');

const PacienteDAO = require('../daos/PacienteDAO');
const PacienteService = require('./PacienteService');

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
});
