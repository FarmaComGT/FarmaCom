jest.mock('../daos/CajaDAO');
jest.mock('../daos/SucursalDAO');

const CajaDAO = require('../daos/CajaDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const CajaService = require('./CajaService');

const mockClient = {};
const dueno = { id_usuario: 1, rol: 'dueno', id_sucursal: 1 };
const administrador = { id_usuario: 4, rol: 'administrador', id_sucursal: 1 };
const dependienteSucursal1 = { id_usuario: 2, rol: 'dependiente', id_sucursal: 1 };
const dependienteSucursal2 = { id_usuario: 3, rol: 'dependiente', id_sucursal: 2 };
const otroDependienteSucursal1 = { id_usuario: 5, rol: 'dependiente', id_sucursal: 1 };

describe('CajaService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    CajaDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
  });

  describe('crearCaja', () => {
    it('crea la caja cuando la sucursal existe y el nombre no está repetido', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CajaDAO.obtenerCajaPorNombre.mockResolvedValue(null);
      CajaDAO.crearCaja.mockResolvedValue({ id_caja: 1, nombre: 'Caja 1' });

      await expect(CajaService.crearCaja({ id_sucursal: 1, nombre: 'Caja 1' })).resolves.toEqual({
        id_caja: 1, nombre: 'Caja 1',
      });
    });

    it('rechaza con 404 si la sucursal no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CajaService.crearCaja({ id_sucursal: 99, nombre: 'X' })).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si ya existe una caja con ese nombre', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CajaDAO.obtenerCajaPorNombre.mockResolvedValue({ id_caja: 5 });

      await expect(CajaService.crearCaja({ id_sucursal: 1, nombre: 'Caja 1' })).rejects.toMatchObject({ status: 409 });
    });

    it('traduce la violación de constraint único a un 409', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CajaDAO.obtenerCajaPorNombre.mockResolvedValue(null);
      const error = new Error('dup');
      error.code = '23505';
      error.constraint = 'uq_caja_sucursal_nombre';
      CajaDAO.crearCaja.mockRejectedValue(error);

      await expect(CajaService.crearCaja({ id_sucursal: 1, nombre: 'Caja 1' })).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('obtenerCajas', () => {
    it('un dependiente solo puede consultar su propia sucursal', async () => {
      CajaDAO.obtenerCajas.mockResolvedValue([{ id_caja: 1 }]);

      await CajaService.obtenerCajas({}, dependienteSucursal1);

      expect(CajaDAO.obtenerCajas).toHaveBeenCalledWith({ id_sucursal: 1 });
    });

    it('oculta al dependiente las cajas con sesiones abiertas por otro usuario', async () => {
      CajaDAO.obtenerCajas.mockResolvedValue([
        { id_caja: 1, id_sesion_abierta: null },
        { id_caja: 2, id_sesion_abierta: 10, id_usuario_apertura: 2 },
        { id_caja: 3, id_sesion_abierta: 11, id_usuario_apertura: 5 },
      ]);

      await expect(
        CajaService.obtenerCajas({}, dependienteSucursal1),
      ).resolves.toEqual([
        { id_caja: 1, id_sesion_abierta: null },
        { id_caja: 2, id_sesion_abierta: 10, id_usuario_apertura: 2 },
      ]);
    });

    it('rechaza con 403 si el dependiente pide otra sucursal', async () => {
      await expect(
        CajaService.obtenerCajas({ id_sucursal: 2 }, dependienteSucursal1),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('un dueño puede consultar cualquier sucursal sin forzar el filtro', async () => {
      CajaDAO.obtenerCajas.mockResolvedValue([]);

      await CajaService.obtenerCajas({ id_sucursal: 2 }, dueno);

      expect(CajaDAO.obtenerCajas).toHaveBeenCalledWith({ id_sucursal: 2 });
    });
  });

  describe('actualizarCaja', () => {
    it('rechaza con 404 si la caja no existe', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue(null);

      await expect(CajaService.actualizarCaja(99, {}, dueno)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 403 si el dependiente opera otra sucursal', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 2, nombre: 'Caja 1' });

      await expect(
        CajaService.actualizarCaja(1, { nombre: 'X' }, dependienteSucursal1),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rechaza con 409 si el nuevo nombre ya existe en la sucursal', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1, nombre: 'Caja 1' });
      CajaDAO.obtenerCajaPorNombre.mockResolvedValue({ id_caja: 2 });

      await expect(
        CajaService.actualizarCaja(1, { nombre: 'Caja 2' }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 409 si se intenta desactivar con sesión abierta', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1, nombre: 'Caja 1' });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue({ id_sesion_caja: 1 });

      await expect(
        CajaService.actualizarCaja(1, { activa: false }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('actualiza correctamente', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1, nombre: 'Caja 1' });
      CajaDAO.actualizarCaja.mockResolvedValue({ id_caja: 1, nombre: 'Caja 2' });

      await expect(CajaService.actualizarCaja(1, { nombre: 'Caja 2' }, dueno)).resolves.toEqual({
        id_caja: 1, nombre: 'Caja 2',
      });
    });
  });

  describe('abrirSesion', () => {
    it('rechaza con 404 si la caja no existe', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue(null);

      await expect(
        CajaService.abrirSesion(1, { turno: 'mañana', fondo_inicial: 100 }, dueno),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si la caja está inactiva', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1, activa: false });

      await expect(
        CajaService.abrirSesion(1, { turno: 'mañana', fondo_inicial: 100 }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 409 si ya hay una sesión abierta', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1, activa: true });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue({ id_sesion_caja: 5 });

      await expect(
        CajaService.abrirSesion(1, { turno: 'mañana', fondo_inicial: 100 }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('abre la sesión correctamente', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1, activa: true });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue(null);
      CajaDAO.crearSesion.mockResolvedValue({ id_sesion_caja: 1 });

      await expect(
        CajaService.abrirSesion(1, { turno: 'mañana', fondo_inicial: 100 }, dueno),
      ).resolves.toEqual({ id_sesion_caja: 1 });
    });
  });

  describe('obtenerSesionActual', () => {
    it('rechaza con 404 si la caja no existe', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue(null);

      await expect(CajaService.obtenerSesionActual(1, dueno)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 404 si no hay sesión abierta', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1 });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue(null);

      await expect(CajaService.obtenerSesionActual(1, dueno)).rejects.toMatchObject({ status: 404 });
    });

    it('permite al dependiente consultar su propia sesión', async () => {
      const sesion = { id_sesion_caja: 1, id_usuario_apertura: 2 };
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1 });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue(sesion);

      await expect(
        CajaService.obtenerSesionActual(1, dependienteSucursal1),
      ).resolves.toBe(sesion);
    });

    it('rechaza al dependiente que consulta la sesión de otro usuario', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1 });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue({
        id_sesion_caja: 1,
        id_usuario_apertura: otroDependienteSucursal1.id_usuario,
      });

      await expect(
        CajaService.obtenerSesionActual(1, dependienteSucursal1),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('mantiene el acceso a sesiones ajenas para el administrador', async () => {
      const sesion = { id_sesion_caja: 1, id_usuario_apertura: 5 };
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 1, id_sucursal: 1 });
      CajaDAO.obtenerSesionAbiertaPorCaja.mockResolvedValue(sesion);

      await expect(
        CajaService.obtenerSesionActual(1, administrador),
      ).resolves.toBe(sesion);
    });
  });

  describe('registrarMovimiento', () => {
    const sesionAbierta = { id_sesion_caja: 1, id_sucursal: 1, estado: 'abierta', fondo_inicial: 100 };

    it('rechaza con 404 si la sesión no existe', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(null);

      await expect(
        CajaService.registrarMovimiento(1, { tipo: 'entrada', monto: 10 }, dueno),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si la sesión ya está cerrada', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({ ...sesionAbierta, estado: 'cerrada' });

      await expect(
        CajaService.registrarMovimiento(1, { tipo: 'entrada', monto: 10 }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza movimientos del dependiente sobre una sesión ajena', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        ...sesionAbierta,
        id_usuario_apertura: otroDependienteSucursal1.id_usuario,
      });

      await expect(
        CajaService.registrarMovimiento(
          1,
          { tipo: 'entrada', monto: 10 },
          dependienteSucursal1,
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(CajaDAO.obtenerTotalesSesion).not.toHaveBeenCalled();
      expect(CajaDAO.crearMovimiento).not.toHaveBeenCalled();
    });

    it('permite movimientos del dependiente sobre su propia sesión', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        ...sesionAbierta,
        id_usuario_apertura: dependienteSucursal1.id_usuario,
      });
      CajaDAO.crearMovimiento.mockResolvedValue({ id_movimiento: 1 });

      await expect(
        CajaService.registrarMovimiento(
          1,
          { tipo: 'entrada', monto: 10 },
          dependienteSucursal1,
        ),
      ).resolves.toEqual({ id_movimiento: 1 });
    });

    it('rechaza con 409 si la salida supera el efectivo disponible', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue({
        ventas_efectivo: 0, total_entradas: 0, total_salidas: 0,
      });

      await expect(
        CajaService.registrarMovimiento(1, { tipo: 'salida', monto: 1000 }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('registra una entrada correctamente', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.crearMovimiento.mockResolvedValue({ id_movimiento: 1 });

      await expect(
        CajaService.registrarMovimiento(1, { tipo: 'entrada', monto: 10 }, dueno),
      ).resolves.toEqual({ id_movimiento: 1 });
    });
  });

  describe('cerrarSesion', () => {
    const sesionAbierta = {
      id_sesion_caja: 1, id_sucursal: 1, estado: 'abierta', fondo_inicial: 100,
    };

    it('rechaza con 404 si la sesión no existe', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(null);

      await expect(
        CajaService.cerrarSesion(1, { efectivo_contado: 100 }, dueno),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza el cierre del dependiente sobre una sesión ajena', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        ...sesionAbierta,
        id_usuario_apertura: otroDependienteSucursal1.id_usuario,
      });

      await expect(
        CajaService.cerrarSesion(
          1,
          { efectivo_contado: 100 },
          dependienteSucursal1,
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(CajaDAO.contarPagosPOSPendientes).not.toHaveBeenCalled();
      expect(CajaDAO.obtenerTotalesSesion).not.toHaveBeenCalled();
      expect(CajaDAO.cerrarSesion).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si hay pagos POS pendientes', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.contarPagosPOSPendientes.mockResolvedValue(2);

      await expect(
        CajaService.cerrarSesion(1, { efectivo_contado: 100 }, dueno),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 400 si hay diferencia de efectivo sin observaciones', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue(sesionAbierta);
      CajaDAO.contarPagosPOSPendientes.mockResolvedValue(0);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue({
        ventas_efectivo: 0, ventas_tarjeta: 0, total_entradas: 0, total_salidas: 0,
        cantidad_ventas: 0, cantidad_anulaciones: 0,
      });

      await expect(
        CajaService.cerrarSesion(1, { efectivo_contado: 150 }, dueno),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('cierra la sesión cuadrada cuando no hay diferencia', async () => {
      CajaDAO.obtenerSesionPorId
        .mockResolvedValueOnce(sesionAbierta)
        .mockResolvedValueOnce({ ...sesionAbierta, estado: 'cerrada' });
      CajaDAO.contarPagosPOSPendientes.mockResolvedValue(0);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue({
        ventas_efectivo: 0, ventas_tarjeta: 0, total_entradas: 0, total_salidas: 0,
        cantidad_ventas: 0, cantidad_anulaciones: 0,
      });
      CajaDAO.cerrarSesion.mockResolvedValue({});

      const resultado = await CajaService.cerrarSesion(1, { efectivo_contado: 100 }, dueno);

      expect(resultado.resultado).toBe('cuadrada');
    });

    it('no permite cerrar dos veces la misma sesión', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({ ...sesionAbierta, estado: 'cerrada' });

      await expect(
        CajaService.cerrarSesion(1, { efectivo_contado: 100 }, dueno),
      ).rejects.toMatchObject({ status: 409 });
      expect(CajaDAO.obtenerTotalesSesion).not.toHaveBeenCalled();
    });

    it('marca el cierre como "faltante" cuando el efectivo contado es menor al esperado', async () => {
      CajaDAO.obtenerSesionPorId
        .mockResolvedValueOnce(sesionAbierta)
        .mockResolvedValueOnce({ ...sesionAbierta, estado: 'cerrada' });
      CajaDAO.contarPagosPOSPendientes.mockResolvedValue(0);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue({
        ventas_efectivo: 0, ventas_tarjeta: 0, total_entradas: 0, total_salidas: 0,
        cantidad_ventas: 0, cantidad_anulaciones: 0,
      });
      CajaDAO.cerrarSesion.mockResolvedValue({});

      const resultado = await CajaService.cerrarSesion(
        1, { efectivo_contado: 95, observaciones: 'Faltante detectado' }, dueno,
      );

      expect(resultado.resultado).toBe('faltante');
    });

    it('marca el cierre como "sobrante" cuando el efectivo contado es mayor al esperado', async () => {
      CajaDAO.obtenerSesionPorId
        .mockResolvedValueOnce(sesionAbierta)
        .mockResolvedValueOnce({ ...sesionAbierta, estado: 'cerrada' });
      CajaDAO.contarPagosPOSPendientes.mockResolvedValue(0);
      CajaDAO.obtenerTotalesSesion.mockResolvedValue({
        ventas_efectivo: 0, ventas_tarjeta: 0, total_entradas: 0, total_salidas: 0,
        cantidad_ventas: 0, cantidad_anulaciones: 0,
      });
      CajaDAO.cerrarSesion.mockResolvedValue({});

      const resultado = await CajaService.cerrarSesion(
        1, { efectivo_contado: 110, observaciones: 'Sobrante detectado' }, dueno,
      );

      expect(resultado.resultado).toBe('sobrante');
    });
  });

  describe('obtenerCierres', () => {
    it('agrega el total_ventas calculado a cada cierre', async () => {
      CajaDAO.obtenerCierres.mockResolvedValue([
        { id_sesion_caja: 1, total_ventas_efectivo: 10, total_ventas_tarjeta: 5 },
      ]);

      const resultado = await CajaService.obtenerCierres({});

      expect(resultado[0].total_ventas).toBe('15.00');
    });
  });

  describe('obtenerResumenDiario', () => {
    it('rechaza con 404 si la caja indicada no existe', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue(null);

      await expect(
        CajaService.obtenerResumenDiario('2026-01-01', 1, 5),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 400 si la caja no pertenece a la sucursal', async () => {
      CajaDAO.obtenerCajaPorId.mockResolvedValue({ id_caja: 5, id_sucursal: 2 });

      await expect(
        CajaService.obtenerResumenDiario('2026-01-01', 1, 5),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('devuelve el resumen con totales calculados', async () => {
      CajaDAO.obtenerResumenDiario.mockResolvedValue([
        { id_sucursal: 1, total_ventas_efectivo: 20, total_ventas_tarjeta: 10 },
      ]);

      const resultado = await CajaService.obtenerResumenDiario('2026-01-01', 1);

      expect(resultado[0].total_ventas).toBe('30.00');
    });
  });
});
