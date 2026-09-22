jest.mock('../daos/VentaDAO');
jest.mock('./RecurrenteService');

const VentaDAO = require('../daos/VentaDAO');
const RecurrenteService = require('./RecurrenteService');
const VentaService = require('./VentaService');
const terminalOriginal = process.env.RECURRENTE_TERMINAL_ID;

const usuarioDependiente = {
  id_usuario: 7,
  id_sucursal: 1,
  rol: 'dependiente',
};

const datosVenta = {
  id_sucursal: 1,
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
    id_sucursal: 1,
    stock_actual: 4,
    precio_venta: '10.00',
    precio_compra: '6.25',
    producto_activo: true,
    vencido: false,
  },
  {
    id_lote: 2,
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
      expect(VentaDAO.crearDetalle).toHaveBeenCalledWith({
        id_venta: 21,
        id_lote: 2,
        cantidad: 2,
        precio_unitario: '7.50',
        costo_unitario: '4.10',
      }, {});
      expect(resultado).toEqual({ id_venta: 21, total: '25.00' });
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
    });
  });

  describe('procesarWebhookRecurrente', () => {
    it('crea la venta y descuenta stock cuando el pago fue confirmado', async () => {
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        id_sucursal: 1,
        id_usuario: 7,
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
        metodo_pago: 'tarjeta',
        proveedor_pago: 'recurrente',
        referencia_pago: 'pi_test_123',
        estado_pago: 'pagado',
        total: '25.00',
        cambio: '0.00',
      }), {});
      expect(VentaDAO.descontarStock).toHaveBeenCalledTimes(2);
      expect(VentaDAO.crearDetalle).toHaveBeenCalledWith({
        id_venta: 22,
        id_lote: 2,
        cantidad: 2,
        precio_unitario: '7.50',
        costo_unitario: '4.10',
      }, {});
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
    it('repone el stock de cada detalle y conserva la venta como anulada', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        id_venta: 21,
        id_sucursal: 1,
        estado: 'completada',
      });
      VentaDAO.obtenerDetallesParaAnulacion.mockResolvedValue([
        { id_lote: 1, cantidad: 1 },
        { id_lote: 2, cantidad: 2 },
      ]);
      VentaDAO.restaurarStock.mockResolvedValue({ id_lote: 1 });
      VentaDAO.anular.mockResolvedValue({ id_venta: 21, estado: 'anulada' });
      VentaDAO.obtenerPorId.mockResolvedValue({ id_venta: 21, estado: 'anulada' });

      const resultado = await VentaService.anularVenta(
        21,
        'Error de digitacion',
        usuarioDependiente,
      );

      expect(VentaDAO.restaurarStock).toHaveBeenCalledTimes(2);
      expect(VentaDAO.anular).toHaveBeenCalledWith(
        21,
        'Error de digitacion',
        {},
      );
      expect(resultado.estado).toBe('anulada');
    });

    it('no permite anular dos veces la misma venta', async () => {
      VentaDAO.obtenerParaActualizar.mockResolvedValue({
        id_venta: 21,
        id_sucursal: 1,
        estado: 'anulada',
      });

      await expect(
        VentaService.anularVenta(21, null, usuarioDependiente),
      ).rejects.toMatchObject({
        status: 409,
        message: 'La venta ya esta anulada',
      });
      expect(VentaDAO.restaurarStock).not.toHaveBeenCalled();
    });
  });
});
