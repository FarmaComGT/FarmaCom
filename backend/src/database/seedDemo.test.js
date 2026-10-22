const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { ejecutarSeedDemo, validarEntorno } = require('./seedDemo');

describe('seed de demostración', () => {
  let directorio;
  let ruta;

  beforeEach(async () => {
    directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'farmacom-seed-'));
    ruta = path.join(directorio, 'demo.sql');
    await fs.writeFile(ruta, 'INSERT INTO ejemplo VALUES (1);', 'utf8');
  });

  afterEach(async () => {
    await fs.rm(directorio, { recursive: true, force: true });
  });

  test.each(['production', 'staging', undefined])(
    'rechaza el entorno %s',
    (entorno) => {
      expect(() => validarEntorno(entorno)).toThrow(
        'El seed de demostración sólo puede ejecutarse',
      );
    },
  );

  test.each(['development', 'test'])('permite el entorno %s', (entorno) => {
    expect(() => validarEntorno(entorno)).not.toThrow();
  });

  test('ejecuta el seed dentro de una transacción', async () => {
    const cliente = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    const conexion = { connect: jest.fn().mockResolvedValue(cliente) };
    const logger = { log: jest.fn() };

    await ejecutarSeedDemo({ conexion, entorno: 'test', logger, ruta });

    expect(cliente.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN',
      'INSERT INTO ejemplo VALUES (1);',
      'COMMIT',
    ]);
    expect(cliente.release).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      'Datos de demostración cargados correctamente.',
    );
  });

  test('revierte la transacción cuando falla el SQL', async () => {
    const cliente = {
      query: jest.fn(async (sql) => {
        if (sql.startsWith('INSERT')) throw new Error('Fallo SQL simulado');
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    await expect(ejecutarSeedDemo({
      conexion: { connect: jest.fn().mockResolvedValue(cliente) },
      entorno: 'development',
      logger: { log: jest.fn() },
      ruta,
    })).rejects.toThrow('Fallo SQL simulado');

    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });
});
