jest.mock('./ResumenDiarioProgramacionService');
jest.mock('./ResumenDiarioEnvioService');
const Programacion = require('./ResumenDiarioProgramacionService');
const Envio = require('./ResumenDiarioEnvioService');
const { ejecutar } = require('./ResumenDiarioTareasService');
beforeEach(() => jest.resetAllMocks());
test('un ciclo en curso bloquea otro ciclo local', async () => {
  let completar;
  Programacion.procesarProgramacion.mockImplementation(() => new Promise((resolve) => { completar = resolve; }));
  const primero = ejecutar();
  await ejecutar();
  expect(Programacion.procesarProgramacion).toHaveBeenCalledTimes(1);
  completar(); await primero;
  expect(Envio.procesarPendientes).toHaveBeenCalledTimes(1);
});
test('procesa pendientes aunque falle la generación de nuevos reportes', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    Programacion.procesarProgramacion.mockRejectedValue(new Error('Falla'));
    await ejecutar();
    expect(Envio.procesarPendientes).toHaveBeenCalledTimes(1);
    await ejecutar();
    expect(Envio.procesarPendientes).toHaveBeenCalledTimes(2);
  } finally { error.mockRestore(); }
});
