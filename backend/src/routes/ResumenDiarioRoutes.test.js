let mockRol = 'dueno';
jest.mock('../middlewares/verificarToken', () => (req, res, next) => {
  req.usuario = { rol: mockRol }; next();
});
jest.mock('../services/ResumenDiarioService');
const express = require('express');
const request = require('supertest');
const Service = require('../services/ResumenDiarioService');
const app = express();
app.use('/api/reportes', require('./ReporteRoutes'));
beforeEach(() => { mockRol = 'dueno'; Service.obtener.mockReset(); });

test('permite al dueño generar un resumen de sucursales seleccionadas', async () => {
  Service.obtener.mockResolvedValue({ estado: 'provisional' });
  const res = await request(app).get('/api/reportes/resumen-diario?fecha=2026-11-04&sucursales=1,2');
  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toBe('no-store');
  expect(Service.obtener).toHaveBeenCalledWith({ fecha: '2026-11-04', sucursales: [1, 2] });
});
test.each(['administrador', 'dependiente'])('restringe el resumen para %s', async (rol) => {
  mockRol = rol;
  expect((await request(app).get('/api/reportes/resumen-diario')).status).toBe(403);
  expect(Service.obtener).not.toHaveBeenCalled();
});
test.each(['fecha=2026-02-30', 'sucursales=1,x', 'sucursales='])('valida filtros: %s', async (query) => {
  expect((await request(app).get(`/api/reportes/resumen-diario?${query}`)).status).toBe(400);
  expect(Service.obtener).not.toHaveBeenCalled();
});
