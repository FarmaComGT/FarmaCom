jest.mock('../database/db');
const pool = require('../database/db');
const Service = require('./PacienteService');
let client;
beforeEach(() => {
  client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});

it('crea paciente y expediente con dos entradas y un solo commit', async () => {
  client.query.mockResolvedValue({ rows: [] });
  client.query.mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id_paciente: 1, edad_manual: 30 }] })
    .mockResolvedValueOnce({ rows: [{ id_expediente: 2, id_paciente: 1 }] });
  await Service.registrarPaciente({ nombre_paciente: 'Ana', edad_manual: 30 }, 9);
  const entradas = client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO bitacora'));
  expect(entradas.map(([, valores]) => valores.slice(0, 4))).toEqual([
    [9, 'paciente', 1, 'crear'], [9, 'expediente_laboratorio', 2, 'crear'],
  ]);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
});

it('bloquea el paciente y audita los valores retornados por la actualizacion', async () => {
  client.query.mockResolvedValue({ rows: [] });
  client.query.mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id_paciente: 1, telefono: '123', estado: 'activo' }] })
    .mockResolvedValueOnce({ rows: [{ id_paciente: 1, telefono: '456', estado: 'activo' }] });
  await Service.actualizarPaciente(1, { telefono: '456' }, 9);
  expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE');
  expect(client.query.mock.calls[3][1]).toEqual([
    9, 'paciente', 1, 'actualizar', { telefono: '123' }, { telefono: '456' },
  ]);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
});

it('revierte la anulacion si no se puede guardar la bitacora', async () => {
  client.query.mockResolvedValue({ rows: [] });
  client.query.mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id_paciente: 1, estado: 'activo' }] })
    .mockResolvedValueOnce({ rows: [{ id_paciente: 1, estado: 'anulado', motivo_anulacion: 'Duplicado' }] })
    .mockRejectedValueOnce(new Error('fallo bitacora'));
  await expect(Service.anularPaciente(1, 'Duplicado', 9)).rejects.toThrow('fallo bitacora');
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
});
