jest.mock('../database/db');

const pool = require('../database/db');
const BitacoraInventarioDAO = require('./BitacoraInventarioDAO');

describe('BitacoraInventarioDAO', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra instantáneas anteriores y nuevas', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_bitacora: 1 }] });
    const cambio = {
      entidad: 'lote', id_entidad: 7, accion: 'modificacion',
      id_producto: 2, id_lote: 7, id_sucursal: 3, id_usuario: 9,
      anterior: { precio_venta: 10 }, nuevo: { precio_venta: 12 },
    };

    await expect(BitacoraInventarioDAO.registrar(cambio)).resolves.toEqual({ id_bitacora: 1 });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO bitacora_inventario'),
      ['lote', 7, 'modificacion', 2, 7, 3, 9, cambio.anterior, cambio.nuevo],
    );
  });

  it('admite un cliente transaccional y completa los datos opcionales', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id_bitacora: 2 }] }) };

    await expect(BitacoraInventarioDAO.registrar({
      entidad: 'producto', id_entidad: 4, accion: 'alta', id_usuario: 9,
    }, client)).resolves.toEqual({ id_bitacora: 2 });

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO bitacora_inventario'),
      ['producto', 4, 'alta', null, null, null, 9, null, null],
    );
  });

  it('combina auditoría y movimientos con filtros y paginación', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '26' }] })
      .mockResolvedValueOnce({ rows: [
      { id_evento: 'movimiento-2' },
      { id_evento: 'auditoria-1' },
      ] });

    const resultado = await BitacoraInventarioDAO.obtenerHistorial({
      id_producto: 2,
      lote: 'LT-7',
      id_sucursal: 3,
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-31',
      usuario: 'Ana',
      tipo_cambio: 'ajuste',
      pagina: 2,
      limite: 25,
    });

    const [consulta, valores] = pool.query.mock.calls[1];
    expect(consulta).toContain('FROM bitacora_inventario');
    expect(consulta).toContain('FROM movimiento_inventario');
    expect(valores).toEqual([2, '%LT-7%', 'LT-7', 3, '2026-01-01', '2026-01-31', '%Ana%', 'ajuste', 25, 25]);
    expect(resultado).toEqual({
      datos: [
        { id_evento: 'movimiento-2' },
        { id_evento: 'auditoria-1' },
      ],
      paginacion: { pagina: 2, limite: 25, total: 26, total_paginas: 2 },
    });
  });

  it('consulta sin filtros con la paginación predeterminada', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(BitacoraInventarioDAO.obtenerHistorial({})).resolves.toEqual({
      datos: [],
      paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 },
    });

    expect(pool.query.mock.calls[1][1]).toEqual([
      null, null, null, null, null, null, null, null, 25, 0,
    ]);
  });
});
