jest.mock('../daos/VentaDAO');
jest.mock('../daos/CajaDAO');
jest.mock('../daos/PromocionDAO');

const VentaDAO = require('../daos/VentaDAO');
const CajaDAO = require('../daos/CajaDAO');
const PromocionDAO = require('../daos/PromocionDAO');
const {
  puedeAccederSucursal,
  validarAccesoSucursal,
  verificarCliente,
  validarDatosBasicosVenta,
  validarSesionCaja,
  obtenerPromocionesAplicables,
  prepararVenta,
} = require('./VentaPreparacionService');

const usuarioDueno = { id_usuario: 1, rol: 'dueno', id_sucursal: 1 };
const usuarioAdministrador = { id_usuario: 2, rol: 'administrador', id_sucursal: 1 };
const usuarioDependiente = { id_usuario: 7, rol: 'dependiente', id_sucursal: 1 };

const loteBase = {
  id_lote: 10,
  id_producto: 1,
  id_sucursal: 1,
  producto_activo: true,
  vencido: false,
  stock_actual: 20,
  precio_venta: 8.5,
  precio_compra: 5,
};

describe('VentaPreparacionService', () => {
  beforeEach(() => {
    PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([]);
  });

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
        id_usuario_apertura: 7,
        estado: 'abierta',
      });

      await expect(validarSesionCaja(datos, usuarioDependiente, client)).resolves.toBe(9);
      expect(CajaDAO.obtenerSesionPorId).toHaveBeenCalledWith(9, client, 'share');
    });

    it('rechaza una sesión de caja cerrada', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 7,
        estado: 'cerrada',
      });

      await expect(validarSesionCaja(datos, usuarioDependiente, {})).rejects.toMatchObject({
        status: 409,
        message: 'La sesión de caja está cerrada',
      });
    });

    it('rechaza al dependiente que intenta vender con una sesión ajena', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 8,
        estado: 'abierta',
      });

      await expect(
        validarSesionCaja(datos, usuarioDependiente, {}),
      ).rejects.toMatchObject({ status: 403 });
    });

    it.each([
      ['dueño', usuarioDueno],
      ['administrador', usuarioAdministrador],
    ])('permite al %s operar una sesión ajena', async (_rol, usuario) => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 8,
        estado: 'abierta',
      });

      await expect(validarSesionCaja(datos, usuario, {})).resolves.toBe(9);
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
      expect(PromocionDAO.obtenerVigentesParaVenta).toHaveBeenCalledWith([1], 1, undefined);
    });

    it('acumula la cantidad del producto entre lotes y aplica la promoción vigente', async () => {
      const client = {};
      const detalles = [
        { id_lote: 10, cantidad: 2, lote: { ...loteBase, id_lote: 10 } },
        { id_lote: 11, cantidad: 3, lote: { ...loteBase, id_lote: 11 } },
      ];
      PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([{
        id_promocion: 5,
        id_producto: 1,
        cantidad_minima: 5,
        precio_promocion: '6.50',
      }]);

      const promociones = await obtenerPromocionesAplicables(detalles, 1, client);

      expect(promociones.get(1)).toMatchObject({
        id_promocion: 5,
        precio_promocion: '6.50',
      });
      expect(PromocionDAO.obtenerVigentesParaVenta).toHaveBeenCalledWith([1], 1, client);
    });

    it('mantiene el precio normal cuando no alcanza la cantidad mínima', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([loteBase]);
      PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([{
        id_promocion: 5,
        id_producto: 1,
        cantidad_minima: 3,
        precio_promocion: '6.50',
      }]);

      const resultado = await prepararVenta(datosVenta, usuarioDueno);

      expect(resultado.totalCentavos).toBe(1700);
      expect(resultado.detallesCalculados[0].precio_unitario).toBe('8.50');
    });

    it('aplica el mismo precio promocional a los lotes FEFO del producto', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([
        { ...loteBase, id_lote: 10, stock_actual: 2 },
        { ...loteBase, id_lote: 11, stock_actual: 3, precio_venta: '9.00' },
      ]);
      PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([{
        id_promocion: 5,
        id_producto: 1,
        cantidad_minima: 5,
        precio_promocion: '6.50',
      }]);

      const resultado = await prepararVenta({
        ...datosVenta,
        detalles: [{ id_lote: 10, cantidad: 2 }, { id_lote: 11, cantidad: 3 }],
      }, usuarioDueno);

      expect(resultado.totalCentavos).toBe(3250);
      expect(resultado.detallesCalculados).toEqual([
        { id_lote: 10, cantidad: 2, precio_unitario: '6.50', costo_unitario: '5.00' },
        { id_lote: 11, cantidad: 3, precio_unitario: '6.50', costo_unitario: '5.00' },
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
