const crypto = require('crypto');
const RecurrenteService = require('./RecurrenteService');

describe('RecurrenteService', () => {
  const fetchOriginal = global.fetch;
  const secretOriginal = process.env.RECURRENTE_SECRET_KEY;
  const webhookSecretOriginal = process.env.RECURRENTE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.RECURRENTE_SECRET_KEY = 'rk_test_123';
    process.env.RECURRENTE_WEBHOOK_SECRET = `whsec_${Buffer.from('webhook-secret').toString('base64')}`;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    process.env.RECURRENTE_SECRET_KEY = secretOriginal;
    process.env.RECURRENTE_WEBHOOK_SECRET = webhookSecretOriginal;
  });

  it('crea un comando de terminal con monto en centavos y external_id', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        id: 'tsc_test_123',
        status: 'pending',
        terminal_id: 'trm_test_123',
        amount_in_cents: 2500,
        currency: 'GTQ',
      })),
    });

    const resultado = await RecurrenteService.crearComandoTerminal({
      terminalId: 'trm_test_123',
      totalCentavos: 2500,
      externalId: 'farmacom-pos-test',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.recurrente.com/api/terminal_session_commands',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-SECRET-KEY': 'rk_test_123',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const [, opciones] = global.fetch.mock.calls[0];
    expect(JSON.parse(opciones.body)).toEqual({
      terminal_id: 'trm_test_123',
      amount_in_cents: 2500,
      currency: 'GTQ',
      external_id: 'farmacom-pos-test',
    });
    expect(resultado.id).toBe('tsc_test_123');
  });

  it('rechaza comandos menores a Q5.00', async () => {
    await expect(
      RecurrenteService.crearComandoTerminal({
        terminalId: 'trm_test_123',
        totalCentavos: 499,
        externalId: 'farmacom-pos-test',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Recurrente requiere un monto mínimo de Q5.00 para pagos en GTQ',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('verifica la firma Svix utilizando el body crudo', () => {
    const body = JSON.stringify({ id: 'pi_test', status: 'succeeded' });
    const id = 'msg_test_123';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto
      .createHmac('sha256', Buffer.from('webhook-secret'))
      .update(`${id}.${timestamp}.${body}`)
      .digest('base64');

    expect(
      RecurrenteService.verificarFirmaWebhook(Buffer.from(body), {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': `v1,${signature}`,
      }),
    ).toBe(true);
  });

  it('rechaza una firma de webhook invalida', () => {
    expect(() => RecurrenteService.verificarFirmaWebhook('{}', {
      'svix-id': 'msg_test_123',
      'svix-timestamp': String(Math.floor(Date.now() / 1000)),
      'svix-signature': 'v1,firma-invalida',
    })).toThrow('Firma de webhook inválida');
  });

  it('normaliza eventos de terminal con metadata.external_id', () => {
    expect(RecurrenteService.normalizarEventoWebhook({
      event: 'payment_intent.succeeded',
      data: {
        id: 'pi_test_123',
        amount_in_cents: 2500,
        currency: 'GTQ',
        checkout: {
          id: 'ch_test_123',
          metadata: { external_id: 'farmacom-pos-test' },
        },
        payment: { id: 'pa_test_123' },
        payment_method: { card: { last4: '4242' } },
      },
    })).toMatchObject({
      idEvento: 'pi_test_123',
      eventType: 'payment_intent.succeeded',
      estado: 'succeeded',
      externalId: 'farmacom-pos-test',
      referenciaPago: 'pi_test_123',
      amountInCents: 2500,
      currency: 'GTQ',
      tarjetaUltimos4: '4242',
    });
  });
});
