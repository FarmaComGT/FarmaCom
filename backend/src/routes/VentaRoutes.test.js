jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/VentaService');

const express = require('express');
const request = require('supertest');
const VentaService = require('../services/VentaService');
const VentaRoutes = require('./VentaRoutes');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ventas', VentaRoutes);
  return app;
};

describe('VentaRoutes - anulación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('anula una venta con el motivo normalizado y el usuario autenticado', async () => {
    VentaService.anularVenta.mockResolvedValue({ id_venta: 21, estado: 'anulada' });

    const respuesta = await request(crearApp())
      .delete('/api/ventas/21')
      .send({ motivo_anulacion: '  Error de cobro  ' });

    expect(respuesta.status).toBe(200);
    expect(VentaService.anularVenta).toHaveBeenCalledWith(
      21,
      'Error de cobro',
      { id_usuario: 7, id_sucursal: 1, rol: 'dependiente' },
    );
  });

  it.each([
    ['sin enviar el campo', {}],
    ['con el motivo vacío', { motivo_anulacion: '' }],
    ['con solo espacios', { motivo_anulacion: '   ' }],
  ])('rechaza la anulación %s', async (_caso, body) => {
    const respuesta = await request(crearApp())
      .delete('/api/ventas/21')
      .send(body);

    expect(respuesta.status).toBe(400);
    expect(VentaService.anularVenta).not.toHaveBeenCalled();
  });

  it('rechaza motivos mayores a 500 caracteres', async () => {
    const respuesta = await request(crearApp())
      .delete('/api/ventas/21')
      .send({ motivo_anulacion: 'a'.repeat(501) });

    expect(respuesta.status).toBe(400);
    expect(VentaService.anularVenta).not.toHaveBeenCalled();
  });

  it('propaga el conflicto de una venta pagada con tarjeta', async () => {
    const error = new Error(
      'Las ventas pagadas con tarjeta requieren un reembolso en Recurrente',
    );
    error.status = 409;
    VentaService.anularVenta.mockRejectedValue(error);

    const respuesta = await request(crearApp())
      .delete('/api/ventas/21')
      .send({ motivo_anulacion: 'Solicitud de devolución' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.mensaje).toContain('reembolso en Recurrente');
  });
});
