jest.mock('../daos/CajaDAO');
jest.mock('../daos/SucursalDAO');

const CajaDAO = require('../daos/CajaDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const CajaService = require('./CajaService');

const dependiente = {
  id_usuario: 7,
  id_sucursal: 1,
  rol: 'dependiente',
};

const caja = {
  id_caja: 3,
  id_sucursal: 1,
  nombre: 'Caja mostrador',
  activa: true,
};

const sesionAbierta = {
  id_sesion_caja: 9,
  id_caja: 3,
  id_sucursal: 1,
  fondo_inicial: '100.00',
  estado: 'abierta',
};

describe('CajaService', () => {
  beforeEach(() => {
    CajaDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion({}));
    CajaDAO.contarPagosPOSPendientes.mockResolvedValue(0);
  });

  describe('crearCaja', () => {
    it('crea una caja en una sucursal existente', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CajaDAO.obtenerCajaPorNombre.mockResolvedValue(null);
      CajaDAO.crearCaja.mockResolvedValue(caja);

      await expect(
        CajaService.crearCaja({ id_sucursal: 1, nombre: 'Caja mostrador' }),
      ).resolves.toEqual(caja);
    });

    it('evita nombres duplicados dentro de la misma sucursal', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CajaDAO.obtenerCajaPorNombre.mockResolvedValue(caja);

      await expect(
        CajaService.crearCaja({ id_sucursal: 1, nombre: 'Caja mostrador' }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('abrirSesion', () => {
    it('abre un turno con el fondo inicial y el usuario autenticado', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue(caja);
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue(null);
      CajaDAO.crearSesion.mockResolvedValue(sesionAbierta);

      const resultado = await CajaService.abrirSesion(3, {
        turno: 'mañana',
        fondo_inicial: '100.00',
      }, dependiente);

      expect(CajaDAO.crearSesion).toHaveBeenCalledWith({
        id_caja: 3,
        id_usuario_apertura: 7,
        turno: 'mañana',
        fondo_inicial: '100.00',
      }, {});
      expect(resultado).toEqual(sesionAbierta);
    });

    it('impide que un dependiente abra una caja de otra sucursal', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ ...caja, id_sucursal: 2 });

      await expect(
        CajaService.abrirSesion(3, {
          turno: 'tarde',
          fondo_inicial: '50.00',
        }, dependiente),
      ).rejects.toMatchObject({ status: 403 });
      expect(CajaDAO.crearSesion).not.toHaveBeenCalled();
    });
  });

  describe('registrarMovimiento', () => {
    it('registra una entrada en una sesión abierta', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.crearMovimiento.mockResolvedValue({
        id_movimiento_caja: 4,
        tipo: 'entrada',
        monto: '20.00',
      });

      const resultado = await CajaService.registrarMovimiento(9, {
        tipo: 'entrada',
        monto: '20.00',
        motivo: 'Refuerzo de fondo',
      }, dependiente);

      expect(CajaDAO.crearMovimiento).toHaveBeenCalledWith({
        id_sesion_caja: 9,
        id_usuario: 7,
        tipo: 'entrada',
        monto: '20.00',
        motivo: 'Refuerzo de fondo',
      }, {});
      expect(resultado.id_movimiento_caja).toBe(4);
    });

    it('rechaza una salida superior al efectivo esperado disponible', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue({
        ventas_efectivo: '50.00',
        ventas_tarjeta: '0.00',
        total_entradas: '0.00',
        total_salidas: '20.00',
        cantidad_ventas: 1,
        cantidad_anulaciones: 0,
      });

      await expect(
        CajaService.registrarMovimiento(9, {
          tipo: 'salida',
          monto: '140.00',
          motivo: 'Retiro',
        }, dependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'La salida supera el efectivo esperado disponible en caja',
      });
      expect(CajaDAO.crearMovimiento).not.toHaveBeenCalled();
    });
  });

  describe('cerrarSesion', () => {
    const totales = {
      ventas_efectivo: '250.00',
      ventas_tarjeta: '80.00',
      total_entradas: '20.00',
      total_salidas: '30.00',
      cantidad_ventas: 8,
      cantidad_anulaciones: 1,
    };

    it('calcula el cierre en backend y clasifica un faltante', async () => {
      const cierreGuardado = {
        ...sesionAbierta,
        estado: 'cerrada',
        total_ventas_efectivo: '250.00',
        total_ventas_tarjeta: '80.00',
        efectivo_esperado: '340.00',
        efectivo_contado: '335.00',
        diferencia_efectivo: '-5.00',
      };
      CajaDAO.obtenerSesionPorId
        .mockResolvedValueOnce(sesionAbierta)
        .mockResolvedValueOnce(cierreGuardado);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue(totales);
      CajaDAO.cerrarSesion.mockResolvedValue(cierreGuardado);

      const resultado = await CajaService.cerrarSesion(9, {
        efectivo_contado: '335.00',
        observaciones: 'Faltante pendiente de revisión',
      }, dependiente);

      expect(CajaDAO.cerrarSesion).toHaveBeenCalledWith(9, expect.objectContaining({
        id_usuario_cierre: 7,
        total_ventas_efectivo: '250.00',
        total_ventas_tarjeta: '80.00',
        efectivo_esperado: '340.00',
        efectivo_contado: '335.00',
        diferencia_efectivo: '-5.00',
        cantidad_ventas: 8,
        cantidad_anulaciones: 1,
      }), {});
      expect(resultado).toMatchObject({
        total_ventas: '330.00',
        resultado: 'faltante',
      });
    });

    it('exige una observación cuando la caja no cuadra', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue(totales);

      await expect(
        CajaService.cerrarSesion(9, {
          efectivo_contado: '335.00',
          observaciones: null,
        }, dependiente),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Las diferencias de efectivo requieren una observación',
      });
      expect(CajaDAO.cerrarSesion).not.toHaveBeenCalled();
    });

    it('no permite cerrar dos veces la misma sesión', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        ...sesionAbierta,
        estado: 'cerrada',
      });

      await expect(
        CajaService.cerrarSesion(9, {
          efectivo_contado: '100.00',
          observaciones: null,
        }, dependiente),
      ).rejects.toMatchObject({ status: 409 });
      expect(CajaDAO.obtenerTotalesSesion).not.toHaveBeenCalled();
    });

    it('impide cerrar mientras exista un pago POS pendiente', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.contarPagosPOSPendientes.mockResolvedValue(1);

      await expect(
        CajaService.cerrarSesion(9, {
          efectivo_contado: '100.00',
          observaciones: 'Conteo físico completado',
        }, dependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'No se puede cerrar la caja mientras haya pagos POS pendientes',
      });
      expect(CajaDAO.obtenerTotalesSesion).not.toHaveBeenCalled();
    });
  });
});
