const crypto = require('crypto');
const RecurrenteService = require('./RecurrenteService');

describe('RecurrenteService', () => {
  const fetchOriginal = global.fetch;
  const secretOriginal = process.env.RECURRENTE_SECRET_KEY;
  const webhookSecretOriginal = process.env.RECURRENTE_WEBHOOK_SECRET;
  const timeoutOriginal = process.env.RECURRENTE_TIMEOUT_MS;

  beforeEach(() => {
    process.env.RECURRENTE_SECRET_KEY = 'rk_test_123';
    process.env.RECURRENTE_WEBHOOK_SECRET = `whsec_${Buffer.from('webhook-secret').toString('base64')}`;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    process.env.RECURRENTE_SECRET_KEY = secretOriginal;
    process.env.RECURRENTE_WEBHOOK_SECRET = webhookSecretOriginal;
    process.env.RECURRENTE_TIMEOUT_MS = timeoutOriginal;
    jest.useRealTimers();
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

  it('consulta un comando de terminal por su identificador', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        id: 'tsc_test_123',
        status: 'dispatched',
        final: false,
      })),
    });

    await expect(RecurrenteService.obtenerComandoTerminal('tsc_test_123'))
      .resolves.toMatchObject({ id: 'tsc_test_123', status: 'dispatched' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.recurrente.com/api/terminal_session_commands/tsc_test_123',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-SECRET-KEY': 'rk_test_123' }) }),
    );
  });

  it('solicita cancelar un comando de terminal', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 202,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        id: 'tsc_test_123',
        status: 'cancel_requested',
        final: false,
      })),
    });

    await expect(RecurrenteService.cancelarComandoTerminal('tsc_test_123'))
      .resolves.toMatchObject({ status: 'cancel_requested' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.recurrente.com/api/terminal_session_commands/tsc_test_123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('clasifica un rechazo 4xx como resultado definitivo', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Terminal no disponible' })),
    });

    await expect(RecurrenteService.crearComandoTerminal({
      terminalId: 'trm_test_123',
      totalCentavos: 2500,
      externalId: 'farmacom-pos-test',
    })).rejects.toMatchObject({
      status: 422,
      resultadoIncierto: false,
    });
  });

  it('clasifica un error 5xx como resultado incierto', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Servicio no disponible' })),
    });

    await expect(RecurrenteService.crearComandoTerminal({
      terminalId: 'trm_test_123',
      totalCentavos: 2500,
      externalId: 'farmacom-pos-test',
    })).rejects.toMatchObject({
      status: 503,
      resultadoIncierto: true,
    });
  });

  it('cancela la espera y marca incierto el resultado al superar el timeout', async () => {
    jest.useFakeTimers();
    process.env.RECURRENTE_TIMEOUT_MS = '1000';
    global.fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));

    const verificacion = expect(RecurrenteService.crearComandoTerminal({
      terminalId: 'trm_test_123',
      totalCentavos: 2500,
      externalId: 'farmacom-pos-test',
    })).rejects.toMatchObject({
      status: 504,
      resultadoIncierto: true,
    });
    await jest.advanceTimersByTimeAsync(1000);
    await verificacion;
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
