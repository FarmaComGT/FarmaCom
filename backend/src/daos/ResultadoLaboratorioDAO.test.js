jest.mock('../database/db');

const pool = require('../database/db');
const ResultadoLaboratorioDAO = require('./ResultadoLaboratorioDAO');

describe('ResultadoLaboratorioDAO', () => {
  it('obtiene el expediente y laboratorio de un paciente', async () => {
    const fila = { id_expediente: 7, id_laboratorio: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ResultadoLaboratorioDAO.obtenerExpedientePorPaciente(3)).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [3]);
  });

  it('busca un resultado por token público', async () => {
    const fila = { id_resultado: 1, token_publico: 'abc-123' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ResultadoLaboratorioDAO.obtenerPorToken('abc-123')).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['abc-123']);
  });

  it('obtiene el laboratorio propietario al bloquear un resultado para actualizarlo', async () => {
    const clienteFalso = { query: jest.fn().mockResolvedValue({
      rows: [{ id_resultado: 10, id_laboratorio: 2 }],
    }) };

    await expect(ResultadoLaboratorioDAO.obtenerParaActualizarConLaboratorio(10, clienteFalso))
      .resolves.toEqual({ id_resultado: 10, id_laboratorio: 2 });

    expect(clienteFalso.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN paciente'),
      [10],
    );
    expect(clienteFalso.query.mock.calls[0][0]).toContain('FOR UPDATE OF r');
  });

  it('lista los resultados de un paciente ordenados por fecha de subida', async () => {
    const filas = [{ id_resultado: 2 }, { id_resultado: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ResultadoLaboratorioDAO.listarPorPaciente(5)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY r.fecha_subida DESC'),
      [5],
    );
  });

  it('devuelve solo los nombres de categoría sugeridos', async () => {
    pool.query.mockResolvedValue({ rows: [{ categoria: 'Orina' }, { categoria: 'Sangre' }] });

    await expect(ResultadoLaboratorioDAO.obtenerCategoriasSugeridas(1)).resolves.toEqual(['Orina', 'Sangre']);
  });

  it('crea un resultado dentro de una transacción', async () => {
    const clienteFalso = { query: jest.fn() };
    clienteFalso.query.mockResolvedValue({ rows: [{ id_resultado: 10 }] });

    const resultado = await ResultadoLaboratorioDAO.crear({
      id_expediente: 7,
      categoria: 'Hematología',
      ruta_archivo: 'token.pdf',
      token_publico: 'token',
      fecha_expiracion: new Date('2027-01-01'),
      id_usuario_subida: 4,
    }, clienteFalso);

    expect(resultado).toEqual({ id_resultado: 10 });
    expect(clienteFalso.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO resultado_laboratorio'),
      [7, 'Hematología', 'token.pdf', 'token', new Date('2027-01-01'), 4],
    );
  });

  it('anula un resultado', async () => {
    const clienteFalso = { query: jest.fn() };
    clienteFalso.query.mockResolvedValue({ rows: [{ id_resultado: 10, estado: 'anulado' }] });

    const resultado = await ResultadoLaboratorioDAO.anular(10, 'Archivo incorrecto', clienteFalso);

    expect(resultado).toEqual({ id_resultado: 10, estado: 'anulado' });
    expect(clienteFalso.query).toHaveBeenCalledWith(
      expect.stringContaining("SET estado = 'anulado'"),
      ['Archivo incorrecto', 10],
    );
  });

  it('lista los resultados vigentes cuya fecha_expiracion ya paso', async () => {
    const filas = [{ id_resultado: 1, estado: 'vigente' }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ResultadoLaboratorioDAO.listarVencidosPendientes()).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("estado = 'vigente'"));
  });

  it('marca un resultado como vencido', async () => {
    const clienteFalso = { query: jest.fn() };
    clienteFalso.query.mockResolvedValue({ rows: [{ id_resultado: 10, estado: 'vencido' }] });

    const resultado = await ResultadoLaboratorioDAO.marcarVencido(10, 'Vencimiento automático (6 meses)', clienteFalso);

    expect(resultado).toEqual({ id_resultado: 10, estado: 'vencido' });
    expect(clienteFalso.query).toHaveBeenCalledWith(
      expect.stringContaining("SET estado = 'vencido'"),
      ['Vencimiento automático (6 meses)', 10],
    );
  });

  describe('ejecutarEnTransaccion', () => {
    const crearConexion = () => ({ query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() });

    it('confirma la transacción y libera la conexión', async () => {
      const conexion = crearConexion();
      pool.connect.mockResolvedValue(conexion);
      const operacion = jest.fn().mockResolvedValue({ id_resultado: 1 });

      await expect(ResultadoLaboratorioDAO.ejecutarEnTransaccion(operacion)).resolves.toEqual({ id_resultado: 1 });

      expect(operacion).toHaveBeenCalledWith(conexion);
      expect(conexion.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
      expect(conexion.release).toHaveBeenCalledTimes(1);
    });

    it('revierte y libera la conexión si la operación falla', async () => {
      const conexion = crearConexion();
      pool.connect.mockResolvedValue(conexion);
      const error = new Error('fallo al guardar el PDF');

      await expect(ResultadoLaboratorioDAO.ejecutarEnTransaccion(jest.fn().mockRejectedValue(error)))
        .rejects.toBe(error);

      expect(conexion.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
      expect(conexion.release).toHaveBeenCalledTimes(1);
    });
  });

  it('devuelve null cuando el paciente no tiene expediente', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ResultadoLaboratorioDAO.obtenerExpedientePorPaciente(3)).resolves.toBeNull();
  });

  it('obtiene un resultado por id usando la conexión indicada', async () => {
    const clienteFalso = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id_resultado: 4 }] })
      .mockResolvedValueOnce({ rows: [] }) };

    await expect(ResultadoLaboratorioDAO.obtenerPorId(4, clienteFalso)).resolves.toEqual({ id_resultado: 4 });
    await expect(ResultadoLaboratorioDAO.obtenerPorId(5, clienteFalso)).resolves.toBeNull();
    expect(clienteFalso.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id_resultado = $1'), [4]);
  });

  it('bloquea un resultado para actualizarlo dentro de la transacción', async () => {
    const clienteFalso = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id_resultado: 4 }] })
      .mockResolvedValueOnce({ rows: [] }) };

    await expect(ResultadoLaboratorioDAO.obtenerParaActualizar(4, clienteFalso)).resolves.toEqual({ id_resultado: 4 });
    await expect(ResultadoLaboratorioDAO.obtenerParaActualizar(5, clienteFalso)).resolves.toBeNull();
    expect(clienteFalso.query.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it.each([
    ['obtenerPorToken', () => ResultadoLaboratorioDAO.obtenerPorToken('no-existe')],
    ['obtenerParaActualizarConLaboratorio', () => ResultadoLaboratorioDAO.obtenerParaActualizarConLaboratorio(9, pool)],
    ['anular', () => ResultadoLaboratorioDAO.anular(9, 'motivo', pool)],
    ['marcarVencido', () => ResultadoLaboratorioDAO.marcarVencido(9, 'motivo', pool)],
  ])('%s devuelve null si el resultado no existe', async (_nombre, consulta) => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(consulta()).resolves.toBeNull();
  });
});
