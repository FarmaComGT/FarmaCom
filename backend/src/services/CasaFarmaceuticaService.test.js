jest.mock('../daos/CasaFarmaceuticaDAO');

const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const CasaFarmaceuticaService = require('./CasaFarmaceuticaService');

describe('CasaFarmaceuticaService', () => {
  describe('crearCasa', () => {
    it('crea la casa cuando el nombre no está repetido', async () => {
      const creada = { id_casa: 1, nombre: 'Bayer' };
      CasaFarmaceuticaDAO.obtenerPorNombre.mockResolvedValue(null);
      CasaFarmaceuticaDAO.crear.mockResolvedValue(creada);

      await expect(CasaFarmaceuticaService.crearCasa({ nombre: 'Bayer' })).resolves.toEqual(creada);
      expect(CasaFarmaceuticaDAO.crear).toHaveBeenCalledWith({ nombre: 'Bayer' });
    });

    it('rechaza con 409 si ya existe una casa con ese nombre', async () => {
      CasaFarmaceuticaDAO.obtenerPorNombre.mockResolvedValue({ id_casa: 2, nombre: 'Bayer' });

      await expect(CasaFarmaceuticaService.crearCasa({ nombre: 'Bayer' })).rejects.toMatchObject({
        message: 'Ya existe una casa farmacéutica con ese nombre',
        status: 409,
      });
      expect(CasaFarmaceuticaDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('devuelve la casa cuando existe', async () => {
      const casa = { id_casa: 1, nombre: 'Bayer' };
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(casa);

      await expect(CasaFarmaceuticaService.obtenerPorId(1)).resolves.toEqual(casa);
    });

    it('rechaza con 404 cuando no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CasaFarmaceuticaService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarCasa', () => {
    it('actualiza cuando la casa existe y el nombre nuevo no está repetido', async () => {
      const existente = { id_casa: 1, nombre: 'Bayer' };
      const actualizada = { id_casa: 1, nombre: 'Bayer S.A.' };
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(existente);
      CasaFarmaceuticaDAO.obtenerPorNombre.mockResolvedValue(null);
      CasaFarmaceuticaDAO.actualizar.mockResolvedValue(actualizada);

      await expect(
        CasaFarmaceuticaService.actualizarCasa(1, { nombre: 'Bayer S.A.' }),
      ).resolves.toEqual(actualizada);
    });

    it('rechaza con 404 si la casa a actualizar no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaFarmaceuticaService.actualizarCasa(99, { nombre: 'X' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(CasaFarmaceuticaDAO.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el nuevo nombre ya pertenece a otra casa', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1, nombre: 'Bayer' });
      CasaFarmaceuticaDAO.obtenerPorNombre.mockResolvedValue({ id_casa: 2, nombre: 'Roche' });

      await expect(
        CasaFarmaceuticaService.actualizarCasa(1, { nombre: 'Roche' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(CasaFarmaceuticaDAO.actualizar).not.toHaveBeenCalled();
    });

    it('no valida duplicidad si el nombre no cambia', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1, nombre: 'Bayer' });
      CasaFarmaceuticaDAO.actualizar.mockResolvedValue({ id_casa: 1, nombre: 'Bayer' });

      await CasaFarmaceuticaService.actualizarCasa(1, { nombre: 'Bayer' });

      expect(CasaFarmaceuticaDAO.obtenerPorNombre).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstado', () => {
    it('cambia el estado cuando la casa existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1 });
      CasaFarmaceuticaDAO.cambiarActivo.mockResolvedValue({ id_casa: 1, activo: false });

      await expect(CasaFarmaceuticaService.cambiarEstado(1, false)).resolves.toEqual({
        id_casa: 1,
        activo: false,
      });
    });

    it('rechaza con 404 si la casa no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CasaFarmaceuticaService.cambiarEstado(99, true)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('eliminarCasa', () => {
    it('elimina la casa cuando existe', async () => {
      CasaFarmaceuticaDAO.eliminar.mockResolvedValue({ id_casa: 1 });

      await expect(CasaFarmaceuticaService.eliminarCasa(1)).resolves.toEqual({
        mensaje: 'Casa farmacéutica eliminada correctamente',
      });
    });

    it('rechaza con 404 si no había nada que eliminar', async () => {
      CasaFarmaceuticaDAO.eliminar.mockResolvedValue(null);

      await expect(CasaFarmaceuticaService.eliminarCasa(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('obtenerProveedoresVinculados', () => {
    it('devuelve los proveedores vinculados a una casa existente', async () => {
      const proveedores = [
        { id_proveedor: 1, nombre: 'Proveedor Uno', activo: true },
        { id_proveedor: 2, nombre: 'Proveedor Dos', activo: false },
      ];
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 5, nombre: 'Casa X' });
      CasaFarmaceuticaDAO.obtenerProveedoresVinculados.mockResolvedValue(proveedores);

      const resultado = await CasaFarmaceuticaService.obtenerProveedoresVinculados(5);

      expect(CasaFarmaceuticaDAO.obtenerPorId).toHaveBeenCalledWith(5);
      expect(CasaFarmaceuticaDAO.obtenerProveedoresVinculados).toHaveBeenCalledWith(5);
      expect(resultado).toEqual(proveedores);
    });

    it('rechaza con 404 si la casa no existe, sin consultar proveedores', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaFarmaceuticaService.obtenerProveedoresVinculados(999),
      ).rejects.toMatchObject({
        message: 'Casa farmacéutica no encontrada',
        status: 404,
      });
      expect(CasaFarmaceuticaDAO.obtenerProveedoresVinculados).not.toHaveBeenCalled();
    });
  });
});
