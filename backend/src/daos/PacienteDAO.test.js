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

describe('PacienteDAO consultas', () => {
  it('obtiene un paciente con su laboratorio y expediente, o null', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_paciente: 3, id_expediente: 8 }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(PacienteDAO.obtenerPorId(3)).resolves.toEqual({ id_paciente: 3, id_expediente: 8 });
    await expect(PacienteDAO.obtenerPorId(99)).resolves.toBeNull();
    expect(pool.query.mock.calls[0][0]).toContain('LEFT JOIN expediente_laboratorio');
  });

  it('bloquea al paciente para actualizarlo dentro de una transacción', async () => {
    const clienteFalso = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id_paciente: 3 }] })
      .mockResolvedValueOnce({ rows: [] }) };

    await expect(PacienteDAO.obtenerParaActualizar(3, clienteFalso)).resolves.toEqual({ id_paciente: 3 });
    await expect(PacienteDAO.obtenerParaActualizar(4, clienteFalso)).resolves.toBeNull();
    expect(clienteFalso.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), [3]);
  });

  it('busca un paciente por DPI', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_paciente: 3, dpi: '1234567890101' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(PacienteDAO.obtenerPorDpi('1234567890101')).resolves.toMatchObject({ id_paciente: 3 });
    await expect(PacienteDAO.obtenerPorDpi('0000000000000')).resolves.toBeNull();
  });

  describe('buscar', () => {
    it('filtra solo por laboratorio y calcula la paginación', async () => {
      pool.query.mockResolvedValue({ rows: [
        { id_paciente: 1, nombre_paciente: 'Ana', total_registros: 12 },
        { id_paciente: 2, nombre_paciente: 'Luis', total_registros: 12 },
      ] });

      const resultado = await PacienteDAO.buscar({ id_laboratorio: 1, pagina: 3, limite: 5 });

      expect(resultado).toEqual({
        datos: [{ id_paciente: 1, nombre_paciente: 'Ana' }, { id_paciente: 2, nombre_paciente: 'Luis' }],
        total: 12,
      });
      const [sql, valores] = pool.query.mock.calls[0];
      expect(sql).toContain('WHERE p.id_laboratorio = $1');
      expect(sql).toContain('LIMIT $2 OFFSET $3');
      expect(valores).toEqual([1, 5, 10]);
    });

    it('agrega estado y búsqueda escapando comodines de LIKE', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const resultado = await PacienteDAO.buscar({
        id_laboratorio: 2,
        estado: 'activo',
        busqueda: '50%_a\\b',
        pagina: 1,
        limite: 10,
      });

      expect(resultado).toEqual({ datos: [], total: 0 });
      const [sql, valores] = pool.query.mock.calls[0];
      expect(sql).toContain('p.estado = $2');
      expect(sql).toContain("p.nombre_paciente ILIKE $3 ESCAPE '\\'");
      expect(valores).toEqual([2, 'activo', '%50\\%\\_a\\\\b%', 10, 0]);
    });
  });
});
