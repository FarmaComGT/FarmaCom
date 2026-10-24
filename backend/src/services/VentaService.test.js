jest.mock('../daos/VentaDAO');
jest.mock('../daos/CajaDAO');
jest.mock('../daos/PromocionDAO');
jest.mock('./RecurrenteService');

const VentaDAO = require('../daos/VentaDAO');
const CajaDAO = require('../daos/CajaDAO');
const PromocionDAO = require('../daos/PromocionDAO');
const RecurrenteService = require('./RecurrenteService');
const VentaService = require('./VentaService');
const terminalOriginal = process.env.RECURRENTE_TERMINAL_ID;

const usuarioDependiente = {
  id_usuario: 7,
  id_sucursal: 1,
  rol: 'dependiente',
};
const usuarioAdministrador = {
  id_usuario: 1,
  id_sucursal: 2,
  rol: 'administrador',
};

const datosVenta = {
  id_sucursal: 1,
  id_sesion_caja: 9,
  id_cliente: null,
  metodo_pago: 'efectivo',
  monto_recibido: 30,
  detalles: [
    { id_lote: 2, cantidad: 2 },
    { id_lote: 1, cantidad: 1 },
  ],
};

const lotesDisponibles = [
  {
    id_lote: 1,
    id_producto: 1,
    id_sucursal: 1,
    stock_actual: 4,
    precio_venta: '10.00',
    precio_compra: '6.25',
    producto_activo: true,
    vencido: false,
  },
  {
    id_lote: 2,
    id_producto: 2,
    id_sucursal: 1,
    stock_actual: 5,
    precio_venta: '7.50',
    precio_compra: '4.10',
    producto_activo: true,
    vencido: false,
  },
];

describe('VentaService', () => {
  beforeEach(() => {
    delete process.env.RECURRENTE_TERMINAL_ID;
    VentaDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion({}));
    CajaDAO.obtenerSesionPorId.mockResolvedValue({
      id_sesion_caja: 9,
      id_sucursal: 1,
      id_usuario_apertura: 7,
      estado: 'abierta',
    });
    PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([]);
  });

  afterAll(() => {
    process.env.RECURRENTE_TERMINAL_ID = terminalOriginal;
  });

  describe('crearVenta', () => {
    it('guarda la venta, descuenta stock y calcula el cambio en el servidor', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearVenta.mockResolvedValue({ id_venta: 21 });
      VentaDAO.descontarStock.mockResolvedValue({ id_lote: 1 });
      VentaDAO.crearDetalle.mockResolvedValue({});
      VentaDAO.obtenerPorId.mockResolvedValue({ id_venta: 21, total: '25.00' });

      const resultado = await VentaService.crearVenta(datosVenta, usuarioDependiente);

      expect(VentaDAO.obtenerLotesParaVenta).toHaveBeenCalledWith([1, 2], {});
      expect(VentaDAO.crearVenta).toHaveBeenCalledWith({
        id_sucursal: 1,
        id_usuario: 7,
        id_sesion_caja: 9,
        id_cliente: null,
        metodo_pago: 'efectivo',
        proveedor_pago: null,
        referencia_pago: null,
        estado_pago: null,
        autorizacion_pago: null,
        tarjeta_ultimos4: null,
        total: '25.00',
        monto_recibido: '30.00',
        cambio: '5.00',
      }, {});
      expect(VentaDAO.descontarStock).toHaveBeenCalledTimes(2);
      expect(VentaDAO.descontarStock.mock.calls).toEqual([
        [2, 2, {}],
        [1, 1, {}],
      ]);
      expect(VentaDAO.crearDetalle.mock.calls).toEqual([
        [{
          id_venta: 21,
          id_lote: 2,
          cantidad: 2,
          precio_unitario: '7.50',
          costo_unitario: '4.10',
        }, {}],
        [{
          id_venta: 21,
          id_lote: 1,
          cantidad: 1,
          precio_unitario: '10.00',
          costo_unitario: '6.25',
        }, {}],
      ]);
      expect(VentaDAO.crearDetalle).toHaveBeenCalledWith({
        id_venta: 21,
        id_lote: 2,
        cantidad: 2,
        precio_unitario: '7.50',
        costo_unitario: '4.10',
      }, {});
      expect(VentaDAO.descontarStock.mock.invocationCallOrder[0])
        .toBeLessThan(VentaDAO.crearDetalle.mock.invocationCallOrder[0]);
      expect(VentaDAO.crearDetalle.mock.invocationCallOrder[0])
        .toBeLessThan(VentaDAO.descontarStock.mock.invocationCallOrder[1]);
      expect(VentaDAO.descontarStock.mock.invocationCallOrder[1])
        .toBeLessThan(VentaDAO.crearDetalle.mock.invocationCallOrder[1]);
      expect(resultado).toEqual({ id_venta: 21, total: '25.00' });
    });

    it('guarda en el detalle el precio promocional realmente cobrado', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([{
        id_promocion: 4,
        id_producto: 2,
        cantidad_minima: 2,
        precio_promocion: '6.00',
      }]);
      VentaDAO.crearVenta.mockResolvedValue({ id_venta: 21 });
      VentaDAO.descontarStock.mockResolvedValue({ id_lote: 1 });
      VentaDAO.crearDetalle.mockResolvedValue({});
      VentaDAO.obtenerPorId.mockResolvedValue({ id_venta: 21, total: '22.00' });

      await VentaService.crearVenta(datosVenta, usuarioDependiente);

      expect(VentaDAO.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({ total: '22.00', cambio: '8.00' }),
        {},
      );
      expect(VentaDAO.crearDetalle).toHaveBeenCalledWith({
        id_venta: 21,
        id_lote: 2,
        cantidad: 2,
        precio_unitario: '6.00',
        costo_unitario: '4.10',
      }, {});
    });

    it('interrumpe la creación de detalles cuando el descuento atómico de stock falla', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearVenta.mockResolvedValue({ id_venta: 21 });
      VentaDAO.descontarStock
        .mockResolvedValueOnce({ id_lote: 2, stock_actual: 3 })
        .mockResolvedValueOnce(null);
      VentaDAO.crearDetalle.mockResolvedValue({});

      await expect(
        VentaService.crearVenta(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'Stock insuficiente para el lote 1',
      });

      expect(VentaDAO.crearDetalle).toHaveBeenCalledTimes(1);
      expect(VentaDAO.crearDetalle).toHaveBeenCalledWith(expect.objectContaining({
        id_venta: 21,
        id_lote: 2,
      }), {});
      expect(VentaDAO.obtenerPorId).not.toHaveBeenCalled();
    });

    it('rechaza la venta completa si un lote no tiene stock suficiente', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([
        lotesDisponibles[0],
        { ...lotesDisponibles[1], stock_actual: 1 },
      ]);

      await expect(
        VentaService.crearVenta(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'Stock insuficiente para el lote 2',
      });
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
    });

    it('bloquea lotes vencidos', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([
        { ...lotesDisponibles[0], vencido: true },
        lotesDisponibles[1],
      ]);

      await expect(
        VentaService.crearVenta(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'No se puede vender el lote 1 porque esta vencido',
      });
    });

    it('rechaza pagos que no sean efectivo o tarjeta', async () => {
      await expect(
        VentaService.crearVenta(
          { ...datosVenta, metodo_pago: 'mixto' },
          usuarioDependiente,
        ),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Los pagos con tarjeta deben iniciarse desde el POS de Recurrente',
      });
      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
    });

    it('rechaza un monto recibido menor que el total calculado', async () => {
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);

      await expect(
        VentaService.crearVenta(
          { ...datosVenta, monto_recibido: 20 },
          usuarioDependiente,
        ),
      ).rejects.toMatchObject({
        status: 400,
        message: 'El monto recibido es insuficiente. El total es Q25.00',
      });
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
    });

    it('rechaza ventas asociadas a una sesión cerrada', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 7,
        estado: 'cerrada',
      });

      await expect(
        VentaService.crearVenta(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'La sesión de caja está cerrada',
      });
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
    });

    it('rechaza ventas del dependiente sobre una sesión ajena', async () => {
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 8,
        estado: 'abierta',
      });

      await expect(
        VentaService.crearVenta(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({ status: 403 });
      expect(VentaDAO.obtenerLotesParaVenta).not.toHaveBeenCalled();
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
    });

    it('rechaza detalles duplicados para el mismo lote', async () => {
      await expect(
        VentaService.crearVenta({
          ...datosVenta,
          detalles: [
            { id_lote: 1, cantidad: 1 },
            { id_lote: 1, cantidad: 2 },
          ],
        }, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Cada lote debe aparecer una sola vez en los detalles de la venta',
      });
      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
    });

    it('impide que un dependiente venda inventario de otra sucursal', async () => {
      await expect(
        VentaService.crearVenta(
          { ...datosVenta, id_sucursal: 2 },
          usuarioDependiente,
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
    });
  });

  describe('crearPagoPOS', () => {
    it('no reserva inventario ni abre una transacción si falta la terminal configurada', async () => {
      await expect(
        VentaService.crearPagoPOS(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Configura RECURRENTE_TERMINAL_ID para procesar pagos con POS',
      });

      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });

    it('rechaza pagos POS del dependiente sobre una sesión ajena', async () => {
      process.env.RECURRENTE_TERMINAL_ID = 'trm_test_123';
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 8,
        estado: 'abierta',
      });

      await expect(
        VentaService.crearPagoPOS(datosVenta, usuarioDependiente),
      ).rejects.toMatchObject({ status: 403 });
      expect(VentaDAO.obtenerLotesParaVenta).not.toHaveBeenCalled();
      expect(VentaDAO.crearPagoPOS).not.toHaveBeenCalled();
      expect(RecurrenteService.crearComandoTerminal).not.toHaveBeenCalled();
    });

    it('calcula el total, guarda la orden pendiente y crea el comando de terminal', async () => {
      process.env.RECURRENTE_TERMINAL_ID = 'trm_test_123';
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearPagoPOS.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        terminal_id: 'trm_test_123',
        total: '25.00',
        estado: 'pendiente',
      });
      VentaDAO.actualizarPagoPOS.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        terminal_id: 'trm_test_123',
        total: '25.00',
        estado: 'pendiente',
      });
      RecurrenteService.crearComandoTerminal.mockResolvedValue({
        id: 'tsc_test_123',
        status: 'pending',
      });

      const resultado = await VentaService.crearPagoPOS(
        datosVenta,
        usuarioDependiente,
      );

      expect(RecurrenteService.crearComandoTerminal).toHaveBeenCalledWith({
        terminalId: 'trm_test_123',
        totalCentavos: 2500,
        externalId: expect.any(String),
      });
      const pagoGuardado = VentaDAO.crearPagoPOS.mock.calls[0][0];
      expect(pagoGuardado).toEqual({
        external_id: expect.stringMatching(/^farmacom-pos-/),
        id_sucursal: 1,
        id_usuario: 7,
        id_sesion_caja: 9,
        id_cliente: null,
        terminal_id: 'trm_test_123',
        total: '25.00',
        detalles: [
          {
            id_lote: 2,
            cantidad: 2,
            precio_unitario: '7.50',
            costo_unitario: '4.10',
          },
          {
            id_lote: 1,
            cantidad: 1,
            precio_unitario: '10.00',
            costo_unitario: '6.25',
          },
        ],
      });
      expect(RecurrenteService.crearComandoTerminal.mock.calls[0][0].externalId)
        .toBe(pagoGuardado.external_id);
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith({
        external_id: pagoGuardado.external_id,
        estado: 'pendiente',
        comando_recurrente_id: 'tsc_test_123',
      }, {});
      expect(resultado).toEqual({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        estado: 'pendiente',
        terminal_id: 'trm_test_123',
        total: '25.00',
        moneda: 'GTQ',
      });
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
      expect(VentaDAO.crearDetalle).not.toHaveBeenCalled();
    });

    it('envía al POS el total promocional calculado por el backend', async () => {
      process.env.RECURRENTE_TERMINAL_ID = 'trm_test_123';
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([{
        id_promocion: 4,
        id_producto: 2,
        cantidad_minima: 2,
        precio_promocion: '6.00',
      }]);
      VentaDAO.crearPagoPOS.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-promo',
        terminal_id: 'trm_test_123',
        total: '22.00',
        estado: 'pendiente',
      });
      VentaDAO.actualizarPagoPOS.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-promo',
        terminal_id: 'trm_test_123',
        total: '22.00',
        estado: 'pendiente',
      });
      RecurrenteService.crearComandoTerminal.mockResolvedValue({
        id: 'tsc_promo',
        status: 'pending',
      });

      await VentaService.crearPagoPOS(datosVenta, usuarioDependiente);

      expect(RecurrenteService.crearComandoTerminal).toHaveBeenCalledWith(
        expect.objectContaining({ totalCentavos: 2200 }),
      );
      expect(VentaDAO.crearPagoPOS).toHaveBeenCalledWith(
        expect.objectContaining({
          total: '22.00',
          detalles: expect.arrayContaining([
            expect.objectContaining({ id_lote: 2, precio_unitario: '6.00' }),
          ]),
        }),
        {},
      );
    });

    it('marca la orden como fallida si Recurrente rechaza el comando de terminal', async () => {
      process.env.RECURRENTE_TERMINAL_ID = 'trm_test_123';
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearPagoPOS.mockResolvedValue({ total: '25.00' });
      VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: 'fallido' });
      const errorRecurrente = new Error('Terminal no disponible');
      RecurrenteService.crearComandoTerminal.mockRejectedValue(errorRecurrente);

      await expect(
        VentaService.crearPagoPOS(datosVenta, usuarioDependiente),
      ).rejects.toBe(errorRecurrente);

      const { external_id: externalId } = VentaDAO.crearPagoPOS.mock.calls[0][0];
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith({
        external_id: externalId,
        estado: 'fallido',
        estado_pago: 'error_al_iniciar',
      }, {});
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });

    it.each([
      ['dispatched', 'procesando'],
      ['failed', 'fallido'],
    ])('traduce el estado %s del terminal a %s', async (estadoTerminal, estadoEsperado) => {
      process.env.RECURRENTE_TERMINAL_ID = 'trm_test_123';
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearPagoPOS.mockResolvedValue({ total: '25.00' });
      RecurrenteService.crearComandoTerminal.mockResolvedValue({
        command_id: 'cmd_test_123',
        status: estadoTerminal,
      });
      VentaDAO.actualizarPagoPOS.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        terminal_id: 'trm_test_123',
        total: '25.00',
        estado: estadoEsperado,
      });

      await VentaService.crearPagoPOS(datosVenta, usuarioDependiente);

      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
        estado: estadoEsperado,
        comando_recurrente_id: 'cmd_test_123',
      }), {});
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });
  });

  describe('procesarWebhookRecurrente', () => {
    it('verifica la firma antes de consultar o modificar pagos', async () => {
      const errorFirma = new Error('Firma de webhook invalida');
      errorFirma.status = 401;
      RecurrenteService.verificarFirmaWebhook.mockImplementation(() => {
        throw errorFirma;
      });

      await expect(
        VentaService.procesarWebhookRecurrente('body-crudo', { firma: 'invalida' }),
      ).rejects.toBe(errorFirma);

      expect(RecurrenteService.normalizarEventoWebhook).not.toHaveBeenCalled();
      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
    });

    it('crea la venta y descuenta stock cuando el pago fue confirmado', async () => {
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        id_sucursal: 1,
        id_usuario: 7,
        id_sesion_caja: 9,
        id_cliente: null,
        total: '25.00',
        detalles: [
          { id_lote: 2, cantidad: 2 },
          { id_lote: 1, cantidad: 1 },
        ],
        estado: 'pendiente',
      });
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        idEvento: 'pi_test_123',
        eventType: 'payment_intent.succeeded',
        estado: 'succeeded',
        externalId: 'farmacom-pos-test',
        referenciaPago: 'pi_test_123',
        amountInCents: 2500,
        currency: 'GTQ',
        autorizacionPago: 'auth_123',
        tarjetaUltimos4: '4242',
      });
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearVenta.mockResolvedValue({ id_venta: 22 });
      VentaDAO.descontarStock.mockResolvedValue({ id_lote: 1 });
      VentaDAO.crearDetalle.mockResolvedValue({});
      VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: 'pagado' });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: true,
        estado: 'pagado',
        id_venta: 22,
      });
      expect(VentaDAO.crearVenta).toHaveBeenCalledWith(expect.objectContaining({
        id_sesion_caja: 9,
        metodo_pago: 'tarjeta',
        proveedor_pago: 'recurrente',
        referencia_pago: 'pi_test_123',
        estado_pago: 'pagado',
        total: '25.00',
        cambio: '0.00',
      }), {});
      expect(VentaDAO.descontarStock).toHaveBeenCalledTimes(2);
      expect(VentaDAO.descontarStock.mock.calls).toEqual([
        [2, 2, {}],
        [1, 1, {}],
      ]);
      expect(VentaDAO.crearDetalle).toHaveBeenCalledWith({
        id_venta: 22,
        id_lote: 2,
        cantidad: 2,
        precio_unitario: '7.50',
        costo_unitario: '4.10',
      }, {});
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith({
        external_id: 'farmacom-pos-test',
        estado: 'pagado',
        estado_pago: 'succeeded',
        evento_recurrente_id: 'pi_test_123',
        referencia_pago: 'pi_test_123',
        autorizacion_pago: 'auth_123',
        tarjeta_ultimos4: '4242',
        id_venta: 22,
      }, {});
      expect(VentaDAO.descontarStock.mock.invocationCallOrder[0])
        .toBeLessThan(VentaDAO.crearDetalle.mock.invocationCallOrder[0]);
    });

    it.each([
      ['failed', 'payment_intent.failed', 'fallido'],
      ['canceled', 'payment_intent.canceled', 'cancelado'],
    ])('actualiza un pago %s sin crear una venta', async (estado, eventType, estadoEsperado) => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        idEvento: 'evt_test_123',
        externalId: 'farmacom-pos-test',
        estado,
        eventType,
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({ estado: 'pendiente' });
      VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: estadoEsperado });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: true,
        estado: estadoEsperado,
      });
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith({
        external_id: 'farmacom-pos-test',
        estado: estadoEsperado,
        estado_pago: estado,
        evento_recurrente_id: 'evt_test_123',
      }, {});
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });

    it('ignora eventos que no contienen un external_id de FarmaCom', async () => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({ externalId: null });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: false,
        razon: 'Evento sin external_id de FarmaCom',
      });
      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
      expect(VentaDAO.obtenerPagoPOSPorExternalId).not.toHaveBeenCalled();
    });

    it('ignora un external_id que no corresponde a un pago registrado', async () => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        externalId: 'farmacom-pos-inexistente',
        estado: 'succeeded',
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(null);

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: false,
        razon: 'Pago POS no encontrado',
      });
      expect(VentaDAO.obtenerPagoPOSPorExternalId).toHaveBeenCalledWith(
        'farmacom-pos-inexistente',
        {},
        true,
      );
      expect(VentaDAO.actualizarPagoPOS).not.toHaveBeenCalled();
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
    });

    it.each([
      ['un monto diferente', { amountInCents: 2400, currency: 'GTQ', referenciaPago: 'pi_test_123' }],
      ['otra moneda', { amountInCents: 2500, currency: 'USD', referenciaPago: 'pi_test_123' }],
      ['una referencia vacía', { amountInCents: 2500, currency: 'GTQ', referenciaPago: null }],
    ])('rechaza el pago confirmado con %s', async (_caso, camposEvento) => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        idEvento: 'evt_test_123',
        externalId: 'farmacom-pos-test',
        estado: 'succeeded',
        eventType: 'payment_intent.succeeded',
        ...camposEvento,
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        estado: 'pendiente',
        total: '25.00',
      });
      VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: 'rechazado' });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: true,
        estado: 'rechazado',
      });
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
        external_id: 'farmacom-pos-test',
        estado: 'rechazado',
        estado_pago: 'monto_o_moneda_invalida',
      }), {});
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });

    it('rechaza el cobro confirmado si el inventario dejó de estar disponible', async () => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        idEvento: 'evt_test_123',
        externalId: 'farmacom-pos-test',
        estado: 'succeeded',
        eventType: 'payment_intent.succeeded',
        amountInCents: 2500,
        currency: 'GTQ',
        referenciaPago: 'pi_test_123',
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        estado: 'pendiente',
        total: '25.00',
        id_sucursal: 1,
        id_usuario: 7,
        id_cliente: null,
        detalles: datosVenta.detalles,
      });
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([
        lotesDisponibles[0],
        { ...lotesDisponibles[1], stock_actual: 0 },
      ]);
      VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: 'rechazado' });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: true,
        estado: 'rechazado',
      });
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
        estado: 'rechazado',
        estado_pago: 'inventario_no_disponible',
      }), {});
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });

    it('rechaza el cobro si los precios actuales cambian el total preparado', async () => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        idEvento: 'evt_test_123',
        externalId: 'farmacom-pos-test',
        estado: 'succeeded',
        eventType: 'payment_intent.succeeded',
        amountInCents: 2500,
        currency: 'GTQ',
        referenciaPago: 'pi_test_123',
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        estado: 'pendiente',
        total: '25.00',
        id_sucursal: 1,
        id_usuario: 7,
        id_cliente: null,
        detalles: datosVenta.detalles,
      });
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue([
        lotesDisponibles[0],
        { ...lotesDisponibles[1], precio_venta: '8.00' },
      ]);
      VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: 'rechazado' });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: true,
        estado: 'rechazado',
      });
      expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
        estado: 'rechazado',
        estado_pago: 'total_venta_invalido',
      }), {});
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
      expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
    });

    it('falla la transacción si el descuento atómico pierde una carrera de stock', async () => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        idEvento: 'evt_test_123',
        externalId: 'farmacom-pos-test',
        estado: 'succeeded',
        eventType: 'payment_intent.succeeded',
        amountInCents: 2500,
        currency: 'GTQ',
        referenciaPago: 'pi_test_123',
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        estado: 'pendiente',
        total: '25.00',
        id_sucursal: 1,
        id_usuario: 7,
        id_cliente: null,
        detalles: datosVenta.detalles,
      });
      VentaDAO.obtenerLotesParaVenta.mockResolvedValue(lotesDisponibles);
      VentaDAO.crearVenta.mockResolvedValue({ id_venta: 22 });
      VentaDAO.descontarStock.mockResolvedValueOnce(null);

      await expect(
        VentaService.procesarWebhookRecurrente('{}', {}),
      ).rejects.toMatchObject({
        status: 409,
        message: 'Stock insuficiente para el lote 2',
      });
      expect(VentaDAO.crearDetalle).not.toHaveBeenCalled();
      expect(VentaDAO.actualizarPagoPOS).not.toHaveBeenCalled();
    });

    it('no vuelve a crear una venta para un webhook duplicado', async () => {
      RecurrenteService.verificarFirmaWebhook.mockReturnValue(true);
      RecurrenteService.normalizarEventoWebhook.mockReturnValue({
        externalId: 'farmacom-pos-test',
        eventType: 'payment_intent.succeeded',
        estado: 'succeeded',
      });
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        estado: 'pagado',
        id_venta: 22,
      });

      await expect(VentaService.procesarWebhookRecurrente('{}', {})).resolves.toEqual({
        procesado: true,
        duplicado: true,
        estado: 'pagado',
        id_venta: 22,
      });
      expect(VentaDAO.crearVenta).not.toHaveBeenCalled();
    });
  });

  describe('asociarCliente', () => {
    it('permite asociar una venta existente a un cliente', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        id_venta: 21,
        id_sucursal: 1,
      });
      VentaDAO.obtenerClientePorId.mockResolvedValue({ id_cliente: 4 });
      VentaDAO.actualizarCliente.mockResolvedValue({ id_venta: 21, id_cliente: 4 });
      VentaDAO.obtenerPorId.mockResolvedValue({ id_venta: 21, id_cliente: 4 });

      const resultado = await VentaService.asociarCliente(
        21,
        4,
        usuarioDependiente,
      );

      expect(VentaDAO.actualizarCliente).toHaveBeenCalledWith(21, 4, {});
      expect(resultado).toEqual({ id_venta: 21, id_cliente: 4 });
    });
  });

  describe('anularVenta', () => {
    const ventaEfectivo = {
      id_venta: 21,
      id_sucursal: 1,
      id_usuario: 7,
      id_sesion_caja: 9,
      metodo_pago: 'efectivo',
      estado: 'completada',
    };

    it('repone el stock de cada detalle y conserva la venta como anulada', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);
      VentaDAO.obtenerDetallesParaAnulacion.mockResolvedValue([
        { id_lote: 1, cantidad: 1 },
        { id_lote: 2, cantidad: 2 },
      ]);
      VentaDAO.restaurarStock.mockResolvedValue({ id_lote: 1 });
      VentaDAO.anular.mockResolvedValue({ id_venta: 21, estado: 'anulada' });
      VentaDAO.obtenerPorId.mockResolvedValue({ id_venta: 21, estado: 'anulada' });

      const resultado = await VentaService.anularVenta(
        21,
        '  Error de digitacion  ',
        usuarioDependiente,
      );

      expect(CajaDAO.obtenerSesionPorId).toHaveBeenCalledWith(9, {}, 'share');
      expect(VentaDAO.restaurarStock).toHaveBeenCalledTimes(2);
      expect(VentaDAO.anular).toHaveBeenCalledWith(
        21,
        'Error de digitacion',
        7,
        {},
      );
      expect(VentaDAO.anular.mock.invocationCallOrder[0])
        .toBeLessThan(VentaDAO.obtenerDetallesParaAnulacion.mock.invocationCallOrder[0]);
      expect(VentaDAO.obtenerDetallesParaAnulacion.mock.invocationCallOrder[0])
        .toBeLessThan(VentaDAO.restaurarStock.mock.invocationCallOrder[0]);
      expect(resultado.estado).toBe('anulada');
    });

    it.each([null, undefined, '', '   '])(
      'exige un motivo de anulación no vacío (%p)',
      async (motivo) => {
        await expect(
          VentaService.anularVenta(21, motivo, usuarioDependiente),
        ).rejects.toMatchObject({ status: 400 });
        expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
      },
    );

    it('rechaza motivos mayores a 500 caracteres desde el servicio', async () => {
      await expect(
        VentaService.anularVenta(21, 'a'.repeat(501), usuarioDependiente),
      ).rejects.toMatchObject({ status: 400 });
      expect(VentaDAO.ejecutarEnTransaccion).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la venta no existe', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(null);

      await expect(
        VentaService.anularVenta(21, 'Venta inexistente', usuarioDependiente),
      ).rejects.toMatchObject({ status: 404 });
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('impide que el dependiente anule una venta de otra sucursal', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        ...ventaEfectivo,
        id_sucursal: 2,
      });

      await expect(
        VentaService.anularVenta(21, 'Sucursal incorrecta', usuarioDependiente),
      ).rejects.toMatchObject({ status: 403 });
      expect(CajaDAO.obtenerSesionPorId).not.toHaveBeenCalled();
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('impide que el dependiente anule una venta registrada por otro usuario', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        ...ventaEfectivo,
        id_usuario: 8,
      });

      await expect(
        VentaService.anularVenta(21, 'Venta de otro usuario', usuarioDependiente),
      ).rejects.toMatchObject({
        status: 403,
        message: 'Solo el responsable de la venta puede anularla',
      });
      expect(CajaDAO.obtenerSesionPorId).not.toHaveBeenCalled();
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('no concede permisos de anulación a otros roles', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);

      await expect(
        VentaService.anularVenta(21, 'Rol incorrecto', {
          id_usuario: 7,
          id_sucursal: 1,
          rol: 'laboratorista',
        }),
      ).rejects.toMatchObject({ status: 403 });
      expect(CajaDAO.obtenerSesionPorId).not.toHaveBeenCalled();
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('no permite anular dos veces la misma venta', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        ...ventaEfectivo,
        estado: 'anulada',
      });

      await expect(
        VentaService.anularVenta(21, 'Intento duplicado', usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'La venta ya está anulada',
      });
      expect(CajaDAO.obtenerSesionPorId).not.toHaveBeenCalled();
      expect(VentaDAO.restaurarStock).not.toHaveBeenCalled();
    });

    it('rechaza la anulación local de una venta pagada con tarjeta', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        ...ventaEfectivo,
        metodo_pago: 'tarjeta',
        estado_pago: 'pagado',
      });

      await expect(
        VentaService.anularVenta(21, 'Solicita devolución', usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('reembolso en Recurrente'),
      });
      expect(CajaDAO.obtenerSesionPorId).not.toHaveBeenCalled();
      expect(VentaDAO.anular).not.toHaveBeenCalled();
      expect(VentaDAO.restaurarStock).not.toHaveBeenCalled();
    });

    it('rechaza ventas que no están asociadas a una sesión de caja', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        ...ventaEfectivo,
        id_sesion_caja: null,
      });

      await expect(
        VentaService.anularVenta(21, 'Sin sesión', usuarioDependiente),
      ).rejects.toMatchObject({ status: 409 });
      expect(CajaDAO.obtenerSesionPorId).not.toHaveBeenCalled();
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('rechaza si la sesión de caja de la venta no existe', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);
      CajaDAO.obtenerSesionPorId.mockResolvedValue(null);

      await expect(
        VentaService.anularVenta(21, 'Sesión inexistente', usuarioDependiente),
      ).rejects.toMatchObject({ status: 404 });
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('rechaza si la sesión no pertenece a la sucursal de la venta', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 2,
        id_usuario_apertura: 7,
        estado: 'abierta',
      });

      await expect(
        VentaService.anularVenta(21, 'Sesión incorrecta', usuarioDependiente),
      ).rejects.toMatchObject({ status: 409 });
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('impide que un dependiente anule ventas de una sesión ajena', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 8,
        estado: 'abierta',
      });

      await expect(
        VentaService.anularVenta(21, 'Error de digitacion', usuarioDependiente),
      ).rejects.toMatchObject({ status: 403 });
      expect(VentaDAO.obtenerDetallesParaAnulacion).not.toHaveBeenCalled();
      expect(VentaDAO.restaurarStock).not.toHaveBeenCalled();
      expect(VentaDAO.anular).not.toHaveBeenCalled();
    });

    it('rechaza anulaciones cuando la sesión de caja está cerrada', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 7,
        estado: 'cerrada',
      });

      await expect(
        VentaService.anularVenta(21, 'Caja cerrada', usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('sesión de caja cerrada'),
      });
      expect(VentaDAO.anular).not.toHaveBeenCalled();
      expect(VentaDAO.restaurarStock).not.toHaveBeenCalled();
    });

    it('no restaura existencias si la marca atómica de anulación no se aplica', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue(ventaEfectivo);
      VentaDAO.anular.mockResolvedValue(null);

      await expect(
        VentaService.anularVenta(21, 'Solicitud concurrente', usuarioDependiente),
      ).rejects.toMatchObject({ status: 409 });
      expect(VentaDAO.obtenerDetallesParaAnulacion).not.toHaveBeenCalled();
      expect(VentaDAO.restaurarStock).not.toHaveBeenCalled();
    });

    it('permite al administrador anular una venta de otro responsable', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        ...ventaEfectivo,
        id_usuario: 8,
      });
      CajaDAO.obtenerSesionPorId.mockResolvedValue({
        id_sesion_caja: 9,
        id_sucursal: 1,
        id_usuario_apertura: 8,
        estado: 'abierta',
      });
      VentaDAO.anular.mockResolvedValue({ id_venta: 21, estado: 'anulada' });
      VentaDAO.obtenerDetallesParaAnulacion.mockResolvedValue([]);
      VentaDAO.obtenerPorId.mockResolvedValue({ id_venta: 21, estado: 'anulada' });

      await expect(
        VentaService.anularVenta(21, 'Autorizada por administración', usuarioAdministrador),
      ).resolves.toMatchObject({ estado: 'anulada' });
      expect(VentaDAO.anular).toHaveBeenCalledTimes(1);
    });
  });
});
