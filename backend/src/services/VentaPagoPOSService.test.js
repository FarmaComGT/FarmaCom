jest.mock('../daos/VentaDAO');

const VentaDAO = require('../daos/VentaDAO');
const {
  validarEventoPago,
  determinarEstadoPago,
  registrarPagoRechazado,
  completarVentaPagada,
} = require('./VentaPagoPOSService');
const {
  ESTADOS_PAGO_POS,
  CODIGOS_ESTADO_PAGO_POS,
} = require('./VentaPagoConstantes');

describe('VentaPagoPOSService', () => {
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
      total: '10.00',
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_usuario: 7,
      id_cliente: null,
      detalles: [{ id_lote: 1, cantidad: 1 }],
    };
    VentaDAO.obtenerLotesParaVenta.mockResolvedValue([{
      id_lote: 1,
      id_sucursal: 1,
      stock_actual: 2,
      precio_venta: '10.00',
      precio_compra: '6.00',
      producto_activo: true,
      vencido: false,
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
  });
});
