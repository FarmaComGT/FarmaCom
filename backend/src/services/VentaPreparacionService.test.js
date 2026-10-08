jest.mock('../daos/VentaDAO');
jest.mock('../daos/CajaDAO');

const VentaDAO = require('../daos/VentaDAO');
const CajaDAO = require('../daos/CajaDAO');
const {
  puedeAccederSucursal,
  validarAccesoSucursal,
  verificarCliente,
  validarDatosBasicosVenta,
  validarSesionCaja,
  prepararVenta,
} = require('./VentaPreparacionService');

const usuarioDueno = { rol: 'dueno', id_sucursal: 1 };
const usuarioDependiente = { rol: 'dependiente', id_sucursal: 1 };

const loteBase = {
  id_lote: 10,
  id_sucursal: 1,
  producto_activo: true,
  vencido: false,
  stock_actual: 20,
  precio_venta: 8.5,
  precio_compra: 5,
};

describe('VentaPreparacionService', () => {
  describe('puedeAccederSucursal / validarAccesoSucursal', () => {
    it('permite a roles no dependientes operar cualquier sucursal', () => {
      expect(puedeAccederSucursal(usuarioDueno, 99)).toBe(true);
      expect(() => validarAccesoSucursal(usuarioDueno, 99)).not.toThrow();
    });

    it('permite al dependiente operar solo su propia sucursal', () => {
      expect(puedeAccederSucursal(usuarioDependiente, 1)).toBe(true);
      expect(puedeAccederSucursal(usuarioDependiente, 2)).toBe(false);
    });

    it('rechaza con 403 si el dependiente intenta operar otra sucursal', () => {
      expect(() => validarAccesoSucursal(usuarioDependiente, 2)).toThrow(
        expect.objectContaining({ status: 403 }),
      );
    });
  });

  describe('verificarCliente', () => {
    it('no consulta nada si id_cliente es null', async () => {
      await verificarCliente(null);
      expect(VentaDAO.obtenerClientePorId).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si el cliente no existe', async () => {
      VentaDAO.obtenerClientePorId.mockResolvedValue(null);

      await expect(verificarCliente(5)).rejects.toMatchObject({ status: 404 });
    });

    it('no lanza error si el cliente existe', async () => {
      VentaDAO.obtenerClientePorId.mockResolvedValue({ id_cliente: 5 });

      await expect(verificarCliente(5)).resolves.toBeUndefined();
    });
  });

  describe('validarDatosBasicosVenta', () => {
    it('rechaza con 400 si un lote aparece repetido en los detalles', () => {
      const datos = {
        id_sucursal: 1,
        detalles: [{ id_lote: 1, cantidad: 2 }, { id_lote: 1, cantidad: 3 }],
      };

      expect(() => validarDatosBasicosVenta(datos, usuarioDueno)).toThrow(
        expect.objectContaining({ status: 400 }),
      );
    });

    it('devuelve los ids de lote cuando todo es válido', () => {
      const datos = {
        id_sucursal: 1,
        detalles: [{ id_lote: 1, cantidad: 2 }, { id_lote: 2, cantidad: 1 }],
      };

      expect(validarDatosBasicosVenta(datos, usuarioDueno)).toEqual([1, 2]);
    });
  });

  describe('validarSesionCaja', () => {
    const datos = { id_sesion_caja: 9, id_sucursal: 1 };

    it('devuelve la sesión abierta que pertenece a la sucursal', async () => {
      const client = {};
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        estado: 'abierta',
      });

      await expect(validarSesionCaja(datos, usuarioDependiente, client)).resolves.toBe(9);
      expect(CajaDAO.obtenerSesionPorId).toHaveBeenCalledWith(9, client, 'share');
    });

    it('rechaza una sesión de caja cerrada', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        estado: 'cerrada',
      });

      await expect(validarSesionCaja(datos, usuarioDependiente, {})).rejects.toMatchObject({
        status: 409,
        message: 'La sesión de caja está cerrada',
      });
    });
  });

  describe('prepararVenta', () => {
    const datosVenta = {
      id_sucursal: 1,
      id_cliente: null,
      detalles: [{ id_lote: 10, cantidad: 2 }],
    };

    it('prepara la venta calculando totales cuando todo es válido', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([loteBase]);

      const resultado = await prepararVenta(datosVenta, usuarioDueno);

      expect(resultado.id_sucursal).toBe(1);
      expect(resultado.id_cliente).toBeNull();
      expect(resultado.totalCentavos).toBe(1700);
      expect(resultado.detallesCalculados).toEqual([
        { id_lote: 10, cantidad: 2, precio_unitario: '8.50', costo_unitario: '5.00' },
      ]);
    });

    it('rechaza con 404 si uno de los lotes no existe', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([]);

      await expect(prepararVenta(datosVenta, usuarioDueno)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el lote no pertenece a la sucursal indicada', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([{ ...loteBase, id_sucursal: 2 }]);

      await expect(prepararVenta(datosVenta, usuarioDueno)).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 409 si el producto del lote está inactivo', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([{ ...loteBase, producto_activo: false }]);

      await expect(prepararVenta(datosVenta, usuarioDueno)).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 409 si el lote está vencido', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([{ ...loteBase, vencido: true }]);

      await expect(prepararVenta(datosVenta, usuarioDueno)).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 409 si el stock del lote es insuficiente (SCRUM-204)', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([{ ...loteBase, stock_actual: 1 }]);

      await expect(prepararVenta(datosVenta, usuarioDueno)).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('Stock insuficiente'),
      });
    });

    it('rechaza con 403 antes de tocar la base si el dependiente opera otra sucursal', async () => {
      await expect(
        prepararVenta({ ...datosVenta, id_sucursal: 2 }, usuarioDependiente),
      ).rejects.toMatchObject({ status: 403 });
      expect(VentaDAO.obtenerLotesParaVenta).not.toHaveBeenCalled();
    });
  });
});
