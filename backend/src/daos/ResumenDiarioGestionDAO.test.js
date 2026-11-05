jest.mock('../database/db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../database/db');
const DAO = require('./ResumenDiarioGestionDAO');
let client;
beforeEach(() => {
  jest.resetAllMocks();
  client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});

test('revierte todos los cambios si la selección contiene una sucursal inexistente', async () => {
  client.query.mockImplementation(async (sql) => ({ rows: [], rowCount: sql.includes('FOR KEY SHARE') ? 0 : 1 }));
  await expect(DAO.guardarConfiguracion(7, {
    correo_destinatario: 'dueno@example.com', hora_envio: '20:00', automatico: true,
    todas_sucursales: false, sucursales: [1],
  })).rejects.toMatchObject({ status: 400 });
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('libera la conexión y revierte si falla el guardado de las sucursales', async () => {
  client.query.mockImplementation(async (sql) => {
    if (sql.includes('INSERT INTO resumen_diario_sucursal')) throw new Error('Error de escritura');
    return { rows: [], rowCount: 1 };
  });
  await expect(DAO.guardarConfiguracion(7, { todas_sucursales: false, sucursales: [1] }))
    .rejects.toThrow('Error de escritura');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('el acceso histórico consulta simultáneamente propietario e identificador', async () => {
  pool.query.mockResolvedValue({ rows: [] });
  await expect(DAO.obtenerReporte(7, '12')).resolves.toBeNull();
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id_usuario = $1 AND id_reporte = $2'), [7, '12']);
});

test('inserta solo la copia JSON sin columna ni parámetro para el PDF', async () => {
  const datos = { fecha: '2026-11-04', corte: '2026-11-05T02:00:00Z', estado: 'provisional' };
  pool.query.mockResolvedValue({ rows: [{ id_reporte: '12' }] });
  expect(await DAO.guardarReporte(7, datos)).toEqual({ id_reporte: '12' });
  expect(pool.query).toHaveBeenCalledWith(expect.any(String), [7, datos.fecha, datos.corte,
    datos.estado, JSON.stringify(datos)]);
  expect(pool.query.mock.calls[0][0]).not.toMatch(/\bpdf\b/i);
});
