jest.mock('../daos/InventarioDAO');
jest.mock('../database/db');

const InventarioDAO = require('../daos/InventarioDAO');
const pool = require('../database/db');
const InventarioService = require('./InventarioService');

describe('InventarioService', () => {
  describe('obtenerInventarioPorSucursal', () => {
    it('devuelve el inventario cuando la sucursal existe', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_sucursal: 1 }] });
      InventarioDAO.obtenerPorSucursal.mockResolvedValue([{ id_producto: 1 }]);

      await expect(InventarioService.obtenerInventarioPorSucursal(1)).resolves.toEqual([
        { id_producto: 1 },
      ]);
    });

    it('rechaza con 404 si la sucursal no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(InventarioService.obtenerInventarioPorSucursal(99)).rejects.toMatchObject({
        status: 404,
      });
      expect(InventarioDAO.obtenerPorSucursal).not.toHaveBeenCalled();
    });
  });

  describe('obtenerResumenPorSucursal', () => {
    it('devuelve el resumen cuando la sucursal existe', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_sucursal: 1 }] });
      InventarioDAO.obtenerResumenPorSucursal.mockResolvedValue({ total: 10 });

      await expect(InventarioService.obtenerResumenPorSucursal(1)).resolves.toEqual({ total: 10 });
    });

    it('rechaza con 404 si la sucursal no existe', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(InventarioService.obtenerResumenPorSucursal(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
