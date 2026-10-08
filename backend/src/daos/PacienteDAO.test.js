jest.mock('../database/db');

const pool = require('../database/db');
const PacienteDAO = require('./PacienteDAO');

describe('PacienteDAO.actualizar', () => {
  it('distingue entre omitir fecha_nacimiento/edad_manual y limpiarlos explícitamente', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_paciente: 3 }] });

    await PacienteDAO.actualizar(3, { fecha_nacimiento: null, edad_manual: 45 });

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
      null, // nombre_paciente
      false, // incluyeDpi
      null, // dpi
      true, // incluyeFechaNacimiento
      null, // fecha_nacimiento -> se limpia explícitamente
      true, // incluyeEdadManual
      45, // edad_manual
      null, // sexo
      null, // telefono
      null, // direccion
      null, // observaciones
      3,
    ]);
  });

  it('conserva fecha_nacimiento/edad_manual cuando no se incluyen en la actualización', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_paciente: 3 }] });

    await PacienteDAO.actualizar(3, { telefono: '5555-1111' });

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
      null,
      false,
      null,
      false, // incluyeFechaNacimiento
      null,
      false, // incluyeEdadManual
      null,
      null,
      '5555-1111',
      null,
      null,
      3,
    ]);
  });
});

describe('PacienteDAO.obtenerPorNombre', () => {
  it('busca por nombre normalizado (minusculas y sin espacios en los extremos)', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_paciente: 7, nombre_paciente: 'Ana Pérez' }] });

    const paciente = await PacienteDAO.obtenerPorNombre('  Ana Pérez  ');

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['  Ana Pérez  ']);
    expect(paciente).toEqual({ id_paciente: 7, nombre_paciente: 'Ana Pérez' });
  });

  it('devuelve null cuando no existe ningun paciente con ese nombre', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const paciente = await PacienteDAO.obtenerPorNombre('Nombre Inexistente');

    expect(paciente).toBeNull();
  });
});
