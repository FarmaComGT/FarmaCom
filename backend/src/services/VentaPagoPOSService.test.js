jest.mock('../daos/VentaDAO');
jest.mock('../daos/MovimientoInventarioDAO');
jest.mock('../daos/PromocionDAO');

const VentaDAO = require('../daos/VentaDAO');
const PromocionDAO = require('../daos/PromocionDAO');
const {
  validarEventoPago,
  determinarEstadoPago,
  resolverTransicionPago,
  registrarPagoRechazado,
  completarVentaPagada,
  conciliarPagoPOS,
  obtenerEstadoPagoPOS,
} = require('./VentaPagoPOSService');
const {
  ESTADOS_PAGO_POS,
  CODIGOS_ESTADO_PAGO_POS,
} = require('./VentaPagoConstantes');

describe('VentaPagoPOSService', () => {
  beforeEach(() => {
    PromocionDAO.obtenerVigentesParaVenta.mockResolvedValue([]);
    VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue([]);
    VentaDAO.liberarReservaPagoPOS.mockResolvedValue({ id_lote: 1 });
    VentaDAO.consumirReservaPagoPOS.mockResolvedValue({ id_lote: 1, stock_actual: 1 });
  });

  describe('determinarEstadoPago', () => {
    it.each([
      ['succeeded', 'payment_intent.pending', ESTADOS_PAGO_POS.PAGADO],
      ['pending', 'payment_intent.succeeded', ESTADOS_PAGO_POS.PAGADO],
      ['failed', 'payment_intent.pending', ESTADOS_PAGO_POS.FALLIDO],
      ['pending', 'payment_intent.failed', ESTADOS_PAGO_POS.FALLIDO],
      ['canceled', 'payment_intent.pending', ESTADOS_PAGO_POS.CANCELADO],
      ['pending', 'payment_intent.canceled', ESTADOS_PAGO_POS.CANCELADO],
      ['pending', 'payment_intent.updated', ESTADOS_PAGO_POS.PENDIENTE],
    ])('convierte %s / %s en %s', (estado, tipoEvento, esperado) => {
      expect(determinarEstadoPago(estado, tipoEvento)).toBe(esperado);
    });
  });

  describe('resolverTransicionPago', () => {
    it('no permite que un evento pendiente atrase un pago en procesamiento', () => {
      expect(resolverTransicionPago(
        ESTADOS_PAGO_POS.PROCESANDO,
        ESTADOS_PAGO_POS.PENDIENTE,
      )).toBe(ESTADOS_PAGO_POS.PROCESANDO);
    });

    it.each([
      ESTADOS_PAGO_POS.PAGADO,
      ESTADOS_PAGO_POS.FALLIDO,
      ESTADOS_PAGO_POS.CANCELADO,
      ESTADOS_PAGO_POS.RECHAZADO,
    ])('conserva el estado final %s ante eventos atrasados', (estadoFinal) => {
      expect(resolverTransicionPago(
        estadoFinal,
        ESTADOS_PAGO_POS.PENDIENTE,
      )).toBe(estadoFinal);
    });
  });

  describe('validarEventoPago', () => {
    const pago = { total: '25.00' };
    const eventoValido = {
      amountInCents: 2500,
      currency: 'GTQ',
      referenciaPago: 'pi_test_123',
    };

    it('acepta el monto, moneda y referencia esperados', () => {
      expect(validarEventoPago(eventoValido, pago)).toBe(true);
    });

    it.each([
      ['monto distinto', { amountInCents: 2400 }],
      ['moneda distinta', { currency: 'USD' }],
      ['referencia ausente', { referenciaPago: null }],
    ])('rechaza un evento con %s', (_caso, cambio) => {
      expect(validarEventoPago({ ...eventoValido, ...cambio }, pago)).toBe(false);
    });
  });

  it('registra en un solo lugar los datos de un pago rechazado', async () => {
    const client = {};
    const evento = {
      externalId: 'farmacom-pos-test',
      idEvento: 'evt_test_123',
      referenciaPago: 'pi_test_123',
    };
    VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: ESTADOS_PAGO_POS.RECHAZADO });

    await expect(registrarPagoRechazado(
      evento,
      CODIGOS_ESTADO_PAGO_POS.MONTO_O_MONEDA_INVALIDA,
      client,
    )).resolves.toEqual({ procesado: true, estado: ESTADOS_PAGO_POS.RECHAZADO });

    expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith({
      external_id: 'farmacom-pos-test',
      estado: ESTADOS_PAGO_POS.RECHAZADO,
      estado_pago: CODIGOS_ESTADO_PAGO_POS.MONTO_O_MONEDA_INVALIDA,
      evento_recurrente_id: 'evt_test_123',
      referencia_pago: 'pi_test_123',
    }, client);
  });

  it('completa la venta pagada y enlaza el pago POS', async () => {
    const client = {};
    const evento = {
      externalId: 'farmacom-pos-test',
      idEvento: 'evt_test_123',
      estado: 'succeeded',
      referenciaPago: 'pi_test_123',
      autorizacionPago: 'auth_123',
      tarjetaUltimos4: '4242',
    };
    const pago = {
      id_pago_pos: 5,
      total: '10.00',
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_usuario: 7,
      id_cliente: null,
      detalles: [{
        id_lote: 1,
        cantidad: 1,
        id_promocion: null,
        precio_regular: '10.00',
        precio_unitario: '10.00',
        costo_unitario: '6.00',
      }],
    };
    VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue([{
      id_reserva: 8,
      id_pago_pos: 5,
      id_lote: 1,
      cantidad: 1,
    }]);
    VentaDAO.crearVenta.mockResolvedValue({ id_venta: 22 });
    VentaDAO.descontarStock.mockResolvedValue({ id_lote: 1 });
    VentaDAO.crearDetalle.mockResolvedValue({});
    VentaDAO.actualizarPagoPOS.mockResolvedValue({ estado: ESTADOS_PAGO_POS.PAGADO });

    await expect(completarVentaPagada(evento, pago, client)).resolves.toEqual({
      procesado: true,
      estado: ESTADOS_PAGO_POS.PAGADO,
      id_venta: 22,
    });

    expect(VentaDAO.crearVenta).toHaveBeenCalledWith(expect.objectContaining({
      metodo_pago: 'tarjeta',
      proveedor_pago: 'recurrente',
      estado_pago: ESTADOS_PAGO_POS.PAGADO,
      total: '10.00',
    }), client);
    expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
      external_id: 'farmacom-pos-test',
      estado: ESTADOS_PAGO_POS.PAGADO,
      id_venta: 22,
    }), client);
    expect(VentaDAO.consumirReservaPagoPOS).toHaveBeenCalledWith(
      expect.objectContaining({ id_reserva: 8, id_lote: 1, cantidad: 1 }),
      client,
    );
    expect(VentaDAO.descontarStock).not.toHaveBeenCalled();
  });

  describe('obtenerEstadoPagoPOS', () => {
    const pago = {
      id_pago_pos: 5,
      external_id: 'farmacom-pos-test',
      id_sucursal: 1,
      id_usuario: 7,
      estado: ESTADOS_PAGO_POS.PENDIENTE,
      estado_pago: null,
      id_venta: null,
      total: '25.00',
    };

    it('permite al dependiente consultar su propio pago', async () => {
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(pago);

      await expect(obtenerEstadoPagoPOS(
        pago.external_id,
        { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' },
      )).resolves.toMatchObject({ external_id: pago.external_id });
    });

    it('rechaza al dependiente que consulta el pago de otra sesión', async () => {
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(pago);

      await expect(obtenerEstadoPagoPOS(
        pago.external_id,
        { id_usuario: 8, id_sucursal: 1, rol: 'dependiente' },
      )).rejects.toMatchObject({ status: 403 });
    });

    it.each(['dueno', 'administrador'])(
      'mantiene la consulta global para el rol %s',
      async (rol) => {
        VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(pago);

        await expect(obtenerEstadoPagoPOS(
          pago.external_id,
          { id_usuario: 1, id_sucursal: 2, rol },
        )).resolves.toMatchObject({ external_id: pago.external_id });
      },
    );
  });

  describe('conciliarPagoPOS', () => {
    it('completa solo la venta local a partir del cobro guardado', async () => {
      const client = {};
      const pago = {
        id_pago_pos: 5,
        external_id: 'farmacom-pos-test',
        id_sucursal: 1,
        id_usuario: 7,
        id_sesion_caja: 9,
        id_cliente: null,
        total: '10.00',
        detalles: [{
          id_lote: 1,
          cantidad: 1,
          precio_unitario: '10.00',
          costo_unitario: '6.00',
        }],
        estado: ESTADOS_PAGO_POS.INCIDENCIA,
        estado_pago: 'succeeded',
        evento_recurrente_id: 'evt-1',
        referencia_pago: 'pay-1',
        autorizacion_pago: 'auth-1',
        tarjeta_ultimos4: '4242',
      };
      VentaDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion(client));
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(pago);
      VentaDAO.crearVenta.mockResolvedValue({ id_venta: 22 });
      VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue([{
        id_reserva: 8, id_lote: 1, cantidad: 1,
      }]);
      VentaDAO.crearDetalle.mockResolvedValue({});
      VentaDAO.marcarPagoPOSConciliado.mockResolvedValue({ estado: 'pagado' });

      await expect(conciliarPagoPOS(
        pago.external_id,
        { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' },
      )).resolves.toEqual({
        procesado: true,
        estado: 'pagado',
        id_venta: 22,
        conciliado: true,
      });

      expect(VentaDAO.marcarPagoPOSConciliado).toHaveBeenCalledWith({
        external_id: pago.external_id,
        id_venta: 22,
        id_usuario_conciliacion: 7,
      }, client);
    });

    it('rechaza pagos que no tienen una incidencia conciliable', async () => {
      VentaDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion({}));
      VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue({
        external_id: 'farmacom-pos-test',
        id_sucursal: 1,
        id_usuario: 7,
        estado: ESTADOS_PAGO_POS.PROCESANDO,
      });

      await expect(conciliarPagoPOS(
        'farmacom-pos-test',
        { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' },
      )).rejects.toMatchObject({ status: 409 });
    });
  });
});
