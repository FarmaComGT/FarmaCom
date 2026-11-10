jest.mock('../daos/BitacoraLaboratorioDAO');
const DAO = require('../daos/BitacoraLaboratorioDAO');
const { registrarCambio } = require('./BitacoraLaboratorioService');
const client = { query: jest.fn() };
const datos = { id_usuario: 9, entidad: 'paciente', id_entidad: 1, accion: 'actualizar' };

it('registra solo cambios efectivos, incluidos valores limpiados', async () => {
  await registrarCambio({ ...datos,
    anterior: { nombre: 'Ana', telefono: '123', edad: 30 },
    nuevo: { nombre: 'Ana', telefono: null, edad: 31 },
  }, client);
  expect(DAO.crear).toHaveBeenCalledWith({ ...datos,
    valores_anteriores: { telefono: '123', edad: 30 },
    valores_nuevos: { telefono: null, edad: 31 },
  }, client);
});
it('omite operaciones sin cambios y normaliza fechas', async () => {
  await registrarCambio({ ...datos, anterior: { fecha: new Date('2026-01-01') },
    nuevo: { fecha: '2026-01-01T00:00:00.000Z' } }, client);
  expect(DAO.crear).not.toHaveBeenCalled();
});
it('registra una creacion completa', async () => {
  await registrarCambio({ ...datos, accion: 'crear', nuevo: { id_paciente: 1 } }, client);
  expect(DAO.crear).toHaveBeenCalledWith(expect.objectContaining({
    valores_anteriores: null, valores_nuevos: { id_paciente: 1 },
  }), client);
});
it('rechaza cambios sin responsable', async () => {
  await expect(registrarCambio({ ...datos, id_usuario: undefined }, client))
    .rejects.toMatchObject({ status: 401 });
  expect(DAO.crear).not.toHaveBeenCalled();
});
it('propaga fallos de escritura para revertir la transaccion', async () => {
  DAO.crear.mockRejectedValueOnce(new Error('fallo bitacora'));
  await expect(registrarCambio({ ...datos, nuevo: { nombre: 'Ana' } }, client))
    .rejects.toThrow('fallo bitacora');
});
