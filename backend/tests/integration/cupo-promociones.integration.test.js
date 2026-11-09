const pool = require('../../src/database/db');
const { prepararBaseIntegracion } = require('./preparar-base');
const { comprobarCupo } = require('./cupo-promociones.cjs');

beforeAll(() => prepararBaseIntegracion(pool));
afterAll(() => pool.end());
test('respeta el cupo acumulado en ventas concurrentes y en todo el ciclo de pago', () => comprobarCupo(pool));
