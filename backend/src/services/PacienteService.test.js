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
