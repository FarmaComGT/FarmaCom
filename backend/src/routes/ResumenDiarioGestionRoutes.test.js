let mockUsuario = { id_usuario: 7, rol: 'dueno' };
jest.mock('../middlewares/verificarToken', () => (req, res, next) => {
  if (!mockUsuario) return res.sendStatus(401);
  req.usuario = mockUsuario; next();
});
jest.mock('../services/ResumenDiarioGestionService');
const express = require('express');
const request = require('supertest');
const Service = require('../services/ResumenDiarioGestionService');
const app = express();
app.use(express.json());
app.use('/api/reportes/resumen-diario', require('./ResumenDiarioGestionRoutes'));
app.use(require('../middlewares/errorHandler'));
const base = '/api/reportes/resumen-diario';
const config = { correo_destinatario: ' dueno@example.com ', hora_envio: '21:00', automatico: true,
  todas_sucursales: false, sucursales: [1, 2] };
beforeEach(() => { jest.resetAllMocks(); mockUsuario = { id_usuario: 7, rol: 'dueno' }; });

test('guarda la configuración con correo recortado y usuario de la sesión', async () => {
  Service.guardarConfiguracion.mockResolvedValue({ ...config, correo_destinatario: 'dueno@example.com' });
  const res = await request(app).put(`${base}/configuracion`).send(config);
  expect(res.status).toBe(200);
  expect(Service.guardarConfiguracion).toHaveBeenCalledWith(7, { ...config, correo_destinatario: 'dueno@example.com' });
});
test.each([
  { hora_envio: '25:00' }, { correo_destinatario: 'incorrecto' }, { automatico: 'true' },
  { sucursales: [0] }, { sucursales: ['1'] }, { id_usuario: 9 }, { token: 'secreto' },
])('rechaza campos inválidos o ajenos: %j', async (cambio) => {
  expect((await request(app).put(`${base}/configuracion`).send({ ...config, ...cambio })).status).toBe(400);
  expect(Service.guardarConfiguracion).not.toHaveBeenCalled();
});
test('permite guardar un borrador desactivado sin correo', async () => {
  Service.guardarConfiguracion.mockResolvedValue({});
  expect((await request(app).put(`${base}/configuracion`).send({ ...config, correo_destinatario: '', automatico: false })).status).toBe(200);
});
test('requiere autenticación', async () => {
  mockUsuario = null;
  expect((await request(app).get(`${base}/configuracion`)).status).toBe(401);
});
test.each(['administrador', 'dependiente'])('restringe configuración e historial para %s', async (rol) => {
  mockUsuario.rol = rol;
  for (const ruta of ['/configuracion', '/historial', '/historial/12/pdf']) {
    expect((await request(app).get(`${base}${ruta}`)).status).toBe(403);
  }
  expect((await request(app).put(`${base}/configuracion`).send(config)).status).toBe(403);
  expect((await request(app).post(`${base}/historial`).send({})).status).toBe(403);
});
test('crea una copia histórica y devuelve su ubicación', async () => {
  Service.crearReporte.mockResolvedValue({ id_reporte: '12' });
  const res = await request(app).post(`${base}/historial`).send({ fecha: '2026-11-04' });
  expect(res.status).toBe(201);
  expect(res.headers.location).toBe(`${base}/historial/12`);
  expect(Service.crearReporte).toHaveBeenCalledWith(7, '2026-11-04');
});
test('permite generar el resumen de hoy sin cuerpo de solicitud', async () => {
  Service.crearReporte.mockResolvedValue({ id_reporte: '13' });
  expect((await request(app).post(`${base}/historial`)).status).toBe(201);
  expect(Service.crearReporte).toHaveBeenCalledWith(7, undefined);
});
test('pagina el historial sin solicitar datos de otros usuarios', async () => {
  Service.listarReportes.mockResolvedValue({ datos: [], paginacion: { total: 0 } });
  const res = await request(app).get(`${base}/historial?pagina=2&limite=10`);
  expect(res.status).toBe(200);
  expect(Service.listarReportes).toHaveBeenCalledWith(7, 2, 10);
  expect(res.headers['cache-control']).toBe('no-store');
});
test('limita el tamaño de página', async () => {
  expect((await request(app).get(`${base}/historial?limite=100`)).status).toBe(400);
});
test('descarga el PDF generado a partir de una copia histórica', async () => {
  const pdf = Buffer.from('%PDF-1.7\n');
  Service.obtenerReporte.mockResolvedValue({ fecha: '2026-11-04', id_reporte: '12', pdf });
  const res = await request(app).get(`${base}/historial/12/pdf`);
  expect(Service.obtenerReporte).toHaveBeenCalledWith(7, '12', true);
  expect(res.headers['content-type']).toContain('application/pdf');
  expect(res.body).toEqual(pdf);
});
