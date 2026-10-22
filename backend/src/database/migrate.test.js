const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  calcularChecksum,
  ejecutarMigraciones,
  obtenerMigraciones,
} = require('./migrate');

const crearCliente = ({ aplicadas = [], errorSql } = {}) => ({
  query: jest.fn(async (sql) => {
    if (sql === 'SELECT nombre, checksum FROM schema_migrations ORDER BY nombre') {
      return { rows: aplicadas };
    }

    if (sql === errorSql) {
      throw new Error('Fallo SQL simulado');
    }

    return { rows: [] };
  }),
  release: jest.fn(),
});

describe('ejecutor de migraciones', () => {
  let directorio;

  beforeEach(async () => {
    directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'farmacom-migraciones-'));
  });

  afterEach(async () => {
    await fs.rm(directorio, { recursive: true, force: true });
  });

  test('ordena los archivos versionados y rechaza nombres inválidos', async () => {
    await fs.writeFile(path.join(directorio, '010_decima.sql'), 'SELECT 10;', 'utf8');
    await fs.writeFile(path.join(directorio, '002_segunda.sql'), 'SELECT 2;', 'utf8');

    await expect(obtenerMigraciones(directorio)).resolves.toEqual([
      '002_segunda.sql',
      '010_decima.sql',
    ]);

    await fs.writeFile(path.join(directorio, 'sin_version.sql'), 'SELECT 1;', 'utf8');
    await expect(obtenerMigraciones(directorio)).rejects.toThrow(
      'Las migraciones deben usar el formato 001_descripcion.sql',
    );
  });

  test('aplica cada migración en orden y registra su checksum', async () => {
    await fs.writeFile(path.join(directorio, '002_segunda.sql'), 'SELECT 2;', 'utf8');
    await fs.writeFile(path.join(directorio, '001_primera.sql'), 'SELECT 1;', 'utf8');

    const cliente = crearCliente();
    const conexion = { connect: jest.fn().mockResolvedValue(cliente) };
    const logger = { log: jest.fn() };

    await expect(ejecutarMigraciones({ conexion, directorio, logger })).resolves.toEqual({
      aplicadas: 2,
      total: 2,
    });

    const registros = cliente.query.mock.calls
      .filter(([sql]) => sql.startsWith('INSERT INTO schema_migrations'))
      .map(([, parametros]) => parametros);

    expect(registros).toEqual([
      ['001_primera.sql', calcularChecksum('SELECT 1;')],
      ['002_segunda.sql', calcularChecksum('SELECT 2;')],
    ]);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });

  test('no repite una migración aplicada y detecta cambios posteriores', async () => {
    const nombre = '001_inicial.sql';
    const contenido = 'SELECT 1;';
    await fs.writeFile(path.join(directorio, nombre), contenido, 'utf8');

    const clienteActualizado = crearCliente({
      aplicadas: [{ nombre, checksum: calcularChecksum(contenido) }],
    });

    await expect(ejecutarMigraciones({
      conexion: { connect: jest.fn().mockResolvedValue(clienteActualizado) },
      directorio,
      logger: { log: jest.fn() },
    })).resolves.toEqual({ aplicadas: 0, total: 1 });
    expect(clienteActualizado.query).not.toHaveBeenCalledWith('BEGIN');

    const clienteModificado = crearCliente({
      aplicadas: [{ nombre, checksum: calcularChecksum('SELECT 2;') }],
    });

    await expect(ejecutarMigraciones({
      conexion: { connect: jest.fn().mockResolvedValue(clienteModificado) },
      directorio,
      logger: { log: jest.fn() },
    })).rejects.toThrow(`La migración ${nombre} fue modificada después de aplicarse.`);
    expect(clienteModificado.release).toHaveBeenCalledTimes(1);
  });

  test('revierte la transacción cuando falla el SQL', async () => {
    const contenido = 'SELECT romper;';
    await fs.writeFile(path.join(directorio, '001_fallida.sql'), contenido, 'utf8');

    const cliente = crearCliente({ errorSql: contenido });

    await expect(ejecutarMigraciones({
      conexion: { connect: jest.fn().mockResolvedValue(cliente) },
      directorio,
      logger: { log: jest.fn() },
    })).rejects.toThrow('Fallo SQL simulado');

    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });
});
