jest.mock('../database/db');

const pool = require('../database/db');
const CajaDAO = require('./CajaDAO');

describe('CajaDAO', () => {
  describe('ejecutarEnTransaccion', () => {
    it('hace COMMIT cuando la operación resuelve y libera el cliente', async () => {
      const client = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
      pool.connect.mockResolvedValue(client);
      const operacion = jest.fn().mockResolvedValue('ok');

      const resultado = await CajaDAO.ejecutarEnTransaccion(operacion);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(operacion).toHaveBeenCalledWith(client);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
      expect(resultado).toBe('ok');
    });

    it('hace ROLLBACK y relanza el error si la operación falla', async () => {
      const client = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
      pool.connect.mockResolvedValue(client);
      const error = new Error('fallo');
      const operacion = jest.fn().mockRejectedValue(error);

      await expect(CajaDAO.ejecutarEnTransaccion(operacion)).rejects.toThrow('fallo');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  it('crea una caja', async () => {
    const fila = { id_caja: 1, nombre: 'Caja 1' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CajaDAO.crearCaja({ id_sucursal: 1, nombre: 'Caja 1' })).resolves.toEqual(fila);
  });

  it('busca una caja por nombre dentro de una sucursal', async () => {
    const fila = { id_caja: 1, nombre: 'Caja 1' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CajaDAO.obtenerCajaPorNombre(1, 'caja 1')).resolves.toEqual(fila);
  });

  it('obtiene una caja por id, con bloqueo opcional', async () => {
    const fila = { id_caja: 1 };
    const client = { query: jest.fn().mockResolvedValue({ rows: [fila] }) };

    await expect(CajaDAO.obtenerCajaPorId(1, client, true)).resolves.toEqual(fila);
    expect(client.query.mock.calls[0][0]).toContain('FOR UPDATE OF c');
  });

  it('devuelve null cuando no encuentra la caja por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(CajaDAO.obtenerCajaPorId(99)).resolves.toBeNull();
  });

  describe('obtenerCajas', () => {
    it('sin filtros consulta sin WHERE', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await CajaDAO.obtenerCajas();

      expect(pool.query.mock.calls[0][0]).not.toContain('WHERE');
      expect(pool.query.mock.calls[0][1]).toEqual([]);
    });

    it('con id_sucursal y activa arma ambas condiciones', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_caja: 1 }] });

      await CajaDAO.obtenerCajas({ id_sucursal: 1, activa: true });

      const [sql, valores] = pool.query.mock.calls[0];
      expect(sql).toContain('c.id_sucursal = $1');
      expect(sql).toContain('c.activa = $2');
      expect(valores).toEqual([1, true]);
    });
  });

  it('actualiza una caja', async () => {
    const fila = { id_caja: 1, nombre: 'Caja 2' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CajaDAO.actualizarCaja(1, { nombre: 'Caja 2' })).resolves.toEqual(fila);
  });

  it('crea una sesión de caja usando el client de la transacción', async () => {
    const fila = { id_sesion_caja: 1 };
    const client = { query: jest.fn().mockResolvedValue({ rows: [fila] }) };

    await expect(CajaDAO.crearSesion({
      id_caja: 1, id_usuario_apertura: 1, turno: 'mañana', fondo_inicial: 100,
    }, client)).resolves.toEqual(fila);
  });

  it('obtiene la sesión abierta de una caja', async () => {
    const fila = { id_sesion_caja: 1, estado: 'abierta' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CajaDAO.obtenerSesionAbiertaPorCaja(1)).resolves.toEqual(fila);
  });

  describe('obtenerSesionPorId', () => {
    it('sin bloqueo no agrega cláusula FOR', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_sesion_caja: 1 }] });

      await CajaDAO.obtenerSesionPorId(1);

      expect(pool.query.mock.calls[0][0]).not.toContain('FOR ');
    });

    it('con bloqueo "update" agrega FOR UPDATE OF sc', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_sesion_caja: 1 }] });

      await CajaDAO.obtenerSesionPorId(1, pool, 'update');

      expect(pool.query.mock.calls[0][0]).toContain('FOR UPDATE OF sc');
    });

    it('con bloqueo "share" agrega FOR SHARE OF sc', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_sesion_caja: 1 }] });

      await CajaDAO.obtenerSesionPorId(1, pool, 'share');

      expect(pool.query.mock.calls[0][0]).toContain('FOR SHARE OF sc');
    });
  });

  it('crea un movimiento de caja', async () => {
    const fila = { id_movimiento: 1 };
    const client = { query: jest.fn().mockResolvedValue({ rows: [fila] }) };

    await expect(CajaDAO.crearMovimiento({
      id_sesion_caja: 1, id_usuario: 1, tipo: 'entrada', monto: 50, motivo: 'ajuste',
    }, client)).resolves.toEqual(fila);
  });

  it('obtiene los totales de una sesión combinando ventas y movimientos', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ ventas_efectivo: '100.00', ventas_tarjeta: '50.00' }] })
        .mockResolvedValueOnce({ rows: [{ total_entradas: '10.00', total_salidas: '5.00' }] }),
    };

    const resultado = await CajaDAO.obtenerTotalesSesion(1, client);

    expect(resultado).toEqual({
      ventas_efectivo: '100.00',
      ventas_tarjeta: '50.00',
      total_entradas: '10.00',
      total_salidas: '5.00',
    });
  });

  it('cuenta los pagos POS pendientes', async () => {
    pool.query.mockResolvedValue({ rows: [{ cantidad: 3 }] });

    await expect(CajaDAO.contarPagosPOSPendientes(1)).resolves.toBe(3);
  });

  it('cierra una sesión de caja', async () => {
    const fila = { id_sesion_caja: 1, estado: 'cerrada' };
    const client = { query: jest.fn().mockResolvedValue({ rows: [fila] }) };

    await expect(CajaDAO.cerrarSesion(1, {
      id_usuario_cierre: 1,
      total_ventas_efectivo: 100,
      total_ventas_tarjeta: 50,
      total_entradas: 0,
      total_salidas: 0,
      efectivo_esperado: 100,
      efectivo_contado: 100,
      diferencia_efectivo: 0,
      cantidad_ventas: 5,
      cantidad_anulaciones: 0,
    }, client)).resolves.toEqual(fila);
  });

  describe('obtenerCierres', () => {
    it('sin filtros solo exige estado cerrada', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await CajaDAO.obtenerCierres();

      expect(pool.query.mock.calls[0][0]).toContain("sc.estado = 'cerrada'");
      expect(pool.query.mock.calls[0][1]).toEqual([]);
    });

    it('con todos los filtros arma las condiciones en orden', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await CajaDAO.obtenerCierres({
        id_sucursal: 1, id_caja: 2, fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31',
      });

      const [sql, valores] = pool.query.mock.calls[0];
      expect(valores).toEqual([1, 2, '2026-01-01', '2026-01-31']);
      expect(sql).toContain('c.id_sucursal = $1');
      expect(sql).toContain('sc.id_caja = $2');
    });
  });

  describe('obtenerResumenDiario', () => {
    it('sin id_caja no agrega ese filtro', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await CajaDAO.obtenerResumenDiario('2026-01-01', 1);

      const [sql, valores] = pool.query.mock.calls[0];
      expect(valores).toEqual(['2026-01-01', 1]);
      expect(sql).not.toContain('sc.id_caja = $3');
    });

    it('con id_caja agrega el tercer filtro', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await CajaDAO.obtenerResumenDiario('2026-01-01', 1, 2);

      const [sql, valores] = pool.query.mock.calls[0];
      expect(valores).toEqual(['2026-01-01', 1, 2]);
      expect(sql).toContain('sc.id_caja = $3');
    });
  });
});
