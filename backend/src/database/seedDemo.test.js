const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  ejecutarSeedDemo,
  obtenerCredencialesDemo,
  obtenerRondasBcrypt,
  validarContrasenaInicial,
  validarEntorno,
} = require('./seedDemo');

const entornoSeguro = {
  BCRYPT_ROUNDS: '10',
  DEMO_DUENO_PASSWORD: 'Dueno-local-2026!',
  DEMO_LABORATORISTA_PASSWORD: 'Laboratorio-local-2026!',
};

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

  test('exige dos contraseñas iniciales seguras y diferentes', () => {
    expect(() => obtenerCredencialesDemo({})).toThrow('DEMO_DUENO_PASSWORD');
    expect(() => obtenerCredencialesDemo({
      DEMO_DUENO_PASSWORD: 'corta',
      DEMO_LABORATORISTA_PASSWORD: 'Laboratorio-local-2026!',
    })).toThrow('al menos 12 caracteres');
    expect(() => obtenerCredencialesDemo({
      DEMO_DUENO_PASSWORD: 'Clave-compartida-2026!',
      DEMO_LABORATORISTA_PASSWORD: 'Clave-compartida-2026!',
    })).toThrow('deben ser diferentes');
  });

  test('rechaza contraseñas que bcrypt truncaría', () => {
    expect(() => validarContrasenaInicial('CLAVE', 'á'.repeat(37))).toThrow(
      'no puede superar 72 bytes',
    );
  });

  test('restringe el costo de bcrypt a un rango seguro', () => {
    expect(obtenerRondasBcrypt(undefined)).toBe(10);
    expect(obtenerRondasBcrypt('12')).toBe(12);
    expect(() => obtenerRondasBcrypt('4')).toThrow('BCRYPT_ROUNDS');
    expect(() => obtenerRondasBcrypt('texto')).toThrow('BCRYPT_ROUNDS');
  });

  test('ejecuta el seed dentro de una transacción', async () => {
    const cliente = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    const conexion = { connect: jest.fn().mockResolvedValue(cliente) };
    const logger = { log: jest.fn() };
    const generarHash = jest.fn()
      .mockResolvedValueOnce('hash-dueno')
      .mockResolvedValueOnce('hash-laboratorista');

    await ejecutarSeedDemo({
      conexion,
      entorno: 'test',
      env: entornoSeguro,
      logger,
      ruta,
      generarHash,
    });

    expect(generarHash).toHaveBeenNthCalledWith(1, entornoSeguro.DEMO_DUENO_PASSWORD, 10);
    expect(generarHash).toHaveBeenNthCalledWith(2, entornoSeguro.DEMO_LABORATORISTA_PASSWORD, 10);
    expect(cliente.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      'BEGIN',
      'INSERT INTO ejemplo VALUES (1);',
      'COMMIT',
    ]));
    expect(cliente.query.mock.calls[1][1]).toEqual(['hash-dueno', 'hash-laboratorista']);
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
      env: entornoSeguro,
      logger: { log: jest.fn() },
      ruta,
      generarHash: jest.fn()
        .mockResolvedValueOnce('hash-dueno')
        .mockResolvedValueOnce('hash-laboratorista'),
    })).rejects.toThrow('Fallo SQL simulado');

    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });
});
