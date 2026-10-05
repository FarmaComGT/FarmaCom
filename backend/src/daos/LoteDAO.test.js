jest.mock('../database/db');

const pool = require('../database/db');
const LoteDAO = require('./LoteDAO');

describe('LoteDAO', () => {
  describe('ejecutarEnTransaccion', () => {
    it('confirma y libera la conexion cuando la operacion termina', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);

      await expect(
        LoteDAO.ejecutarEnTransaccion(async () => 'resultado'),
      ).resolves.toBe('resultado');

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('revierte y libera la conexion cuando falla la operacion', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);

      await expect(
        LoteDAO.ejecutarEnTransaccion(async () => {
          throw new Error('fallo');
        }),
      ).rejects.toThrow('fallo');

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('obtenerPorNumeroLote', () => {
    it('permite excluir el lote que se esta editando', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const resultado = await LoteDAO.obtenerPorNumeroLote('LT-01', 2, 3, 7);

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['LT-01', 2, 3, 7]);
      expect(resultado).toBeNull();
    });
  });

  describe('actualizar', () => {
    it('envia todos los campos editables y la orden de limpiar mayoreo', async () => {
      const fila = { id_lote: 7, numero_lote: 'LT-02' };
      pool.query.mockResolvedValue({ rows: [fila] });

      const resultado = await LoteDAO.actualizar(7, {
        id_producto: 2,
        numero_lote: 'LT-02',
        limpiar_mayoreo: true,
      });

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
        2, null, null, 'LT-02', null, null, null,
        null, null, null, null, null, true, 7,
      ]);
      expect(resultado).toEqual(fila);
    });
  });

  describe('eliminar', () => {
    it('elimina por id y devuelve la fila eliminada', async () => {
      const fila = { id_lote: 7 };
      pool.query.mockResolvedValue({ rows: [fila] });

      const resultado = await LoteDAO.eliminar(7);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM lote WHERE id_lote = $1 RETURNING *',
        [7],
      );
      expect(resultado).toEqual(fila);
    });
  });
});
