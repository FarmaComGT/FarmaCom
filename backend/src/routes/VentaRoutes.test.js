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
const AppError = require('../errors/AppError');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ventas', VentaRoutes);
  app.use(errorHandler);
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
    const error = new AppError(
      'Las ventas pagadas con tarjeta requieren un reembolso en Recurrente',
      409,
    );
    VentaService.anularVenta.mockRejectedValue(error);

    const respuesta = await request(crearApp())
      .delete('/api/ventas/21')
      .send({ motivo_anulacion: 'Solicitud de devolución' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.mensaje).toContain('reembolso en Recurrente');
  });
});

describe('VentaRoutes - carrito y consultas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const carrito = {
    id_sucursal: '1',
    id_sesion_caja: '9',
    id_cliente: null,
    metodo_pago: 'efectivo',
    monto_recibido: '50.00',
    detalles: [
      { id_lote: '1', cantidad: '2' },
      { id_lote: '3', cantidad: '1' },
    ],
  };

  it('crea una venta en efectivo con los lotes del carrito convertidos a números', async () => {
    VentaService.crearVenta.mockResolvedValue({ id_venta: 30 });

    const respuesta = await request(crearApp()).post('/api/ventas').send(carrito);

    expect(respuesta.status).toBe(201);
    expect(VentaService.crearVenta).toHaveBeenCalledWith({
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_cliente: null,
      metodo_pago: 'efectivo',
      monto_recibido: 50,
      detalles: [{ id_lote: 1, cantidad: 2 }, { id_lote: 3, cantidad: 1 }],
    }, expect.objectContaining({ id_usuario: 7 }));
  });

  it.each([
    ['un carrito vacío', { detalles: [] }, 'detalles debe contener al menos un producto'],
    ['una cantidad de cero', { detalles: [{ id_lote: 1, cantidad: 0 }] }, 'Cada cantidad debe ser un entero positivo'],
    ['un monto con tres decimales', { monto_recibido: '10.555' }, 'monto_recibido debe ser un monto valido'],
    ['pago con tarjeta por esta ruta', { metodo_pago: 'tarjeta' }, 'metodo_pago debe ser efectivo'],
    ['sin turno de caja', { id_sesion_caja: undefined }, 'id_sesion_caja debe ser un entero positivo'],
  ])('rechaza %s', async (_caso, cambios, mensaje) => {
    const respuesta = await request(crearApp()).post('/api/ventas').send({ ...carrito, ...cambios });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.map(({ msg }) => msg).join(' ')).toContain(mensaje);
    expect(VentaService.crearVenta).not.toHaveBeenCalled();
  });

  it('lista ventas con filtros del historial', async () => {
    VentaService.obtenerTodas.mockResolvedValue([]);

    const respuesta = await request(crearApp())
      .get('/api/ventas?id_sucursal=1&estado=anulada&fecha_desde=2026-10-01&fecha_hasta=2026-10-31');

    expect(respuesta.status).toBe(200);
    expect(VentaService.obtenerTodas).toHaveBeenCalledWith(
      { id_sucursal: 1, estado: 'anulada', fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31' },
      expect.objectContaining({ id_usuario: 7 }),
    );
  });

  it('rechaza un estado de venta desconocido en el historial', async () => {
    const respuesta = await request(crearApp()).get('/api/ventas?estado=pendiente');

    expect(respuesta.status).toBe(400);
    expect(VentaService.obtenerTodas).not.toHaveBeenCalled();
  });

  it('obtiene el detalle de una venta', async () => {
    VentaService.obtenerPorId.mockResolvedValue({ id_venta: 21 });

    const respuesta = await request(crearApp()).get('/api/ventas/21');

    expect(respuesta.status).toBe(200);
    expect(VentaService.obtenerPorId).toHaveBeenCalledWith(21, expect.objectContaining({ id_usuario: 7 }));
  });

  it.each([
    ['un cliente', '5', 5],
    ['consumidor final', null, null],
  ])('asocia la venta a %s', async (_caso, idCliente, esperado) => {
    VentaService.asociarCliente.mockResolvedValue({ id_venta: 21 });

    const respuesta = await request(crearApp()).patch('/api/ventas/21/cliente').send({ id_cliente: idCliente });

    expect(respuesta.status).toBe(200);
    expect(VentaService.asociarCliente).toHaveBeenCalledWith(21, esperado, expect.objectContaining({ id_usuario: 7 }));
  });

  it('rechaza asociar un cliente con id inválido', async () => {
    const respuesta = await request(crearApp()).patch('/api/ventas/21/cliente').send({ id_cliente: 'abc' });

    expect(respuesta.status).toBe(400);
    expect(VentaService.asociarCliente).not.toHaveBeenCalled();
  });

  it('rechaza cancelar una venta sin motivo', async () => {
    const respuesta = await request(crearApp()).delete('/api/ventas/21').send({ motivo_anulacion: '   ' });

    expect(respuesta.status).toBe(400);
    expect(VentaService.anularVenta).not.toHaveBeenCalled();
  });
});
