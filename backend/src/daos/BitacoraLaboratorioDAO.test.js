jest.mock('../database/db');

const pool = require('../database/db');
const BitacoraLaboratorioDAO = require('./BitacoraLaboratorioDAO');

describe('BitacoraLaboratorioDAO', () => {
  it('obtiene el expediente y su paciente asociado', async () => {
    const expediente = { id_expediente: 7, id_paciente: 2 };
    pool.query.mockResolvedValue({ rows: [expediente] });

    await expect(BitacoraLaboratorioDAO.obtenerExpedientePorId(7))
      .resolves.toEqual(expediente);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [7]);
  });

  it('consolida cambios del expediente, paciente, resultados y visitas', async () => {
    const historial = [{ id_bitacora: 5, entidad: 'resultado_laboratorio' }];
    pool.query.mockResolvedValue({ rows: historial });

    await expect(BitacoraLaboratorioDAO.obtenerPorExpediente(7))
      .resolves.toEqual(historial);

    const [consulta, parametros] = pool.query.mock.calls[0];
    expect(consulta).toContain("b.entidad = 'expediente_laboratorio'");
    expect(consulta).toContain("b.entidad = 'paciente'");
    expect(consulta).toContain("b.entidad = 'resultado_laboratorio'");
    expect(consulta).toContain("b.entidad = 'visita_laboratorio'");
    expect(consulta).toContain('JOIN usuario');
    expect(consulta).toContain('ORDER BY b.fecha_hora DESC');
    expect(parametros).toEqual([7]);
  });
});
