// Ejercita la configuración real de verificarRol de cada ruta montada en la
// aplicación. Solo la identidad se simula: el rol llega en un encabezado de prueba.
jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  const rol = req.get('x-test-role');
  if (rol) req.usuario = { id_usuario: 9, id_sucursal: 1, id_laboratorio: 1, rol };
  next();
});
jest.mock('../database/db', () => ({
  query: jest.fn().mockRejectedValue(new Error('La prueba no debe consultar la base')),
  connect: jest.fn().mockRejectedValue(new Error('La prueba no debe consultar la base')),
}));
jest.mock('../services/VentaService');
jest.mock('../services/CajaService');
jest.mock('../services/PacienteService');
jest.mock('../services/LaboratorioService');

const request = require('supertest');
const app = require('../app');

const solicitar = (metodo, ruta, rol) => {
  const solicitud = request(app)[metodo](ruta);
  return rol ? solicitud.set('x-test-role', rol) : solicitud;
};

describe('permisos por rol en la aplicación', () => {
  it('responde 401 si la ruta protegida no tiene usuario autenticado', async () => {
    const respuesta = await solicitar('get', '/api/ventas');

    expect(respuesta.status).toBe(401);
  });

  describe('laboratorista fuera del laboratorio', () => {
    it.each([
      ['post', '/api/ventas'],
      ['get', '/api/ventas'],
      ['delete', '/api/ventas/1'],
      ['get', '/api/cajas'],
      ['post', '/api/cajas/1/sesiones'],
      ['get', '/api/productos'],
      ['post', '/api/productos'],
      ['post', '/api/lotes'],
      ['get', '/api/sucursales/1/inventario'],
      ['get', '/api/clientes/1/historial-compras'],
      ['get', '/api/promociones/1'],
      ['get', '/api/reportes/ventas/resumen'],
      ['post', '/api/laboratorios'],
      ['put', '/api/laboratorios/1'],
    ])('no puede %s %s', async (metodo, ruta) => {
      const respuesta = await solicitar(metodo, ruta, 'laboratorista');

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.mensaje).toContain('Acceso denegado');
    });
  });

  describe('dependiente fuera de la operación de farmacia', () => {
    it.each([
      ['get', '/api/pacientes'],
      ['post', '/api/pacientes'],
      ['patch', '/api/pacientes/1/anular'],
      ['get', '/api/resultados-laboratorio'],
      ['post', '/api/resultados-laboratorio'],
      ['get', '/api/laboratorios'],
      ['get', '/api/expedientes/1/bitacora'],
      ['post', '/api/cajas'],
      ['patch', '/api/cajas/1'],
      ['get', '/api/cajas/cierres'],
      ['get', '/api/cajas/cierres/resumen-diario'],
      ['post', '/api/lotes'],
      ['patch', '/api/lotes/1'],
      ['delete', '/api/lotes/1'],
      ['get', '/api/lotes/alertas'],
      ['get', '/api/productos/1/historial-precios'],
      ['get', '/api/reportes/ventas/resumen'],
      ['get', '/api/usuarios'],
      ['post', '/api/categorias'],
      ['post', '/api/casas/1/telefonos'],
      ['put', '/api/casas/1/correos/2'],
      ['delete', '/api/proveedores/1/telefonos/2'],
      ['post', '/api/sucursales/1/correos'],
      ['delete', '/api/telefonos/2'],
    ])('no puede %s %s', async (metodo, ruta) => {
      const respuesta = await solicitar(metodo, ruta, 'dependiente');

      expect(respuesta.status).toBe(403);
    });
  });

  describe('operaciones reservadas al dueño', () => {
    it.each([
      ['post', '/api/usuarios'],
      ['patch', '/api/usuarios/1/estado'],
      ['delete', '/api/usuarios/1'],
      ['post', '/api/sucursales'],
      ['delete', '/api/sucursales/1'],
      ['delete', '/api/casas/1'],
      ['delete', '/api/categorias/1'],
      ['delete', '/api/ciudades/1'],
      ['delete', '/api/presentaciones/1'],
      ['delete', '/api/proveedores/1'],
    ])('el administrador no puede %s %s', async (metodo, ruta) => {
      const respuesta = await solicitar(metodo, ruta, 'administrador');

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.mensaje).toBe('Acceso denegado. Se requiere uno de estos roles: dueno.');
    });
  });

  it.each(['dueno', 'administrador'])(
    'solo el dependiente activa precios de mayoreo; %s recibe 403',
    async (rol) => {
      const respuesta = await solicitar('patch', '/api/productos/1/mayoreo', rol);

      expect(respuesta.status).toBe(403);
    },
  );

  describe('roles autorizados pasan el control de permisos', () => {
    it.each([
      ['dependiente', 'get', '/api/ventas'],
      ['dependiente', 'delete', '/api/ventas/1'],
      ['dependiente', 'post', '/api/cajas/1/sesiones'],
      ['administrador', 'post', '/api/cajas'],
      ['administrador', 'get', '/api/cajas/cierres'],
      ['laboratorista', 'get', '/api/pacientes'],
      ['laboratorista', 'get', '/api/laboratorios'],
      ['dueno', 'post', '/api/laboratorios'],
      ['dependiente', 'post', '/api/clientes/1/telefonos'],
      ['dependiente', 'delete', '/api/clientes/1/correos/2'],
      ['administrador', 'post', '/api/casas/1/telefonos'],
    ])('%s puede %s %s', async (rol, metodo, ruta) => {
      const respuesta = await solicitar(metodo, ruta, rol);

      expect([401, 403]).not.toContain(respuesta.status);
    });
  });
});
