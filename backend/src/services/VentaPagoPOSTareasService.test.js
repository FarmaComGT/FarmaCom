jest.mock('../daos/VentaDAO');
jest.mock('../daos/PromocionDAO');
jest.mock('./RecurrenteService');

const VentaDAO = require('../daos/VentaDAO');
const PromocionDAO = require('../daos/PromocionDAO');
const RecurrenteService = require('./RecurrenteService');
const {
  ejecutar,
  obtenerExpiracionMs,
  procesarPagoVencido,
  validarComando,
} = require('./VentaPagoPOSTareasService');
const {
  CODIGOS_ESTADO_PAGO_POS,
  ESTADOS_PAGO_POS,
} = require('./VentaPagoConstantes');

const pago = {
  id_pago_pos: 5,
  external_id: 'farmacom-pos-test',
  comando_recurrente_id: 'tsc_test_123',
  terminal_id: 'trm_test_123',
  total: '8.00',
  estado: ESTADOS_PAGO_POS.PENDIENTE,
};

const comandoBase = {
  id: 'tsc_test_123',
  external_id: 'farmacom-pos-test',
  terminal_id: 'trm_test_123',
  amount_in_cents: 800,
  currency: 'GTQ',
};

describe('VentaPagoPOSTareasService', () => {
  beforeEach(() => {
    VentaDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion({}));
    VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(pago);
    VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue([]);
    VentaDAO.actualizarPagoPOS.mockImplementation(async (datos) => ({ ...pago, ...datos }));
    VentaDAO.registrarIncidenciaPagoPOS.mockResolvedValue({
      ...pago,
      estado: ESTADOS_PAGO_POS.INCIDENCIA,
    });
    PromocionDAO.liberarUso.mockResolvedValue();
  });

  it('usa tres minutos como vencimiento predeterminado y valida el rango', () => {
    expect(obtenerExpiracionMs({})).toBe(180000);
    expect(obtenerExpiracionMs({ PAGO_POS_EXPIRACION_MS: '180000' })).toBe(180000);
    expect(() => obtenerExpiracionMs({ PAGO_POS_EXPIRACION_MS: '3000' }))
      .toThrow('PAGO_POS_EXPIRACION_MS');
    expect(() => obtenerExpiracionMs({ PAGO_POS_EXPIRACION_MS: 'tres-minutos' }))
      .toThrow('PAGO_POS_EXPIRACION_MS');
  });

  it('cancela localmente y libera reservas cuando Recurrente confirma cancelaciÃ³n', async () => {
    RecurrenteService.obtenerComandoTerminal.mockResolvedValue({
      ...comandoBase,
      status: 'canceled',
      final: true,
      checkout_status: 'unpaid',
    });

    await procesarPagoVencido(pago);

    expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
      external_id: pago.external_id,
      estado: ESTADOS_PAGO_POS.CANCELADO,
      estado_pago: 'canceled',
    }), expect.anything());
    expect(PromocionDAO.liberarUso).toHaveBeenCalledWith(
      { id_pago_pos: pago.id_pago_pos },
      expect.anything(),
    );
    expect(RecurrenteService.cancelarComandoTerminal).not.toHaveBeenCalled();
  });

  it('solicita cancelaciÃ³n y conserva reservas mientras Recurrente no confirme el final', async () => {
    RecurrenteService.obtenerComandoTerminal.mockResolvedValue({
      ...comandoBase,
      status: 'dispatched',
      final: false,
    });
    RecurrenteService.cancelarComandoTerminal.mockResolvedValue({
      ...comandoBase,
      status: 'cancel_requested',
      final: false,
      cancellation_requested_at: '2026-11-10T15:00:00-06:00',
    });

    await procesarPagoVencido(pago);

    expect(RecurrenteService.cancelarComandoTerminal).toHaveBeenCalledWith('tsc_test_123');
    expect(VentaDAO.actualizarPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
      estado: ESTADOS_PAGO_POS.PROCESANDO,
      estado_pago: 'cancel_requested',
    }), expect.anything());
    expect(PromocionDAO.liberarUso).not.toHaveBeenCalled();
  });

  it('registra incidencia si Recurrente confirma que el cobro fue consumido', async () => {
    RecurrenteService.obtenerComandoTerminal.mockResolvedValue({
      ...comandoBase,
      status: 'consumed',
      final: true,
      checkout_id: 'ch_test_123',
      checkout_status: 'paid',
    });

    await procesarPagoVencido(pago);

    expect(VentaDAO.registrarIncidenciaPagoPOS).toHaveBeenCalledWith(expect.objectContaining({
      external_id: pago.external_id,
      referencia_pago: 'ch_test_123',
      codigo_incidencia: CODIGOS_ESTADO_PAGO_POS.CONFIRMACION_REQUERIDA,
    }), expect.anything());
    expect(PromocionDAO.liberarUso).not.toHaveBeenCalled();
  });

  it('recupera idempotentemente el comando si la respuesta inicial no guardÃ³ su id', async () => {
    const pagoSinComando = { ...pago, comando_recurrente_id: null };
    VentaDAO.obtenerPagoPOSPorExternalId.mockResolvedValue(pagoSinComando);
    RecurrenteService.crearComandoTerminal.mockResolvedValue({
      ...comandoBase,
      status: 'pending',
      final: false,
    });
    RecurrenteService.cancelarComandoTerminal.mockResolvedValue({
      ...comandoBase,
      status: 'canceled',
      final: true,
      checkout_status: 'unpaid',
    });

    await procesarPagoVencido(pagoSinComando);

    expect(RecurrenteService.crearComandoTerminal).toHaveBeenCalledWith({
      terminalId: pago.terminal_id,
      totalCentavos: 800,
      externalId: pago.external_id,
    });
    expect(RecurrenteService.cancelarComandoTerminal).toHaveBeenCalledWith('tsc_test_123');
  });

  it('rechaza comandos que no coinciden con el pago local', () => {
    expect(() => validarComando(pago, { ...comandoBase, amount_in_cents: 900 }))
      .toThrow('monto');
  });

  it('continÃºa con otros pagos si uno no puede vencerse', async () => {
    VentaDAO.obtenerPagosPOSVencidos.mockResolvedValue([pago]);
    RecurrenteService.obtenerComandoTerminal.mockRejectedValue(new Error('Proveedor no disponible'));
    const logger = { error: jest.fn() };

    await expect(ejecutar({ env: {}, logger })).resolves.toEqual({ revisados: 1, procesados: 0 });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Proveedor no disponible'));
  });
});
