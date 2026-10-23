module.exports = ({ app, iniciarSesion, request }) => {
  describe('Regresión de funcionalidades existentes', () => {
    test('mantiene el rechazo 403 para un laboratorista en funciones de farmacia', async () => {
      const { cookie } = await iniciarSesion('laboratorista@farma.com');
      const respuesta = await request(app)
        .post('/api/categorias')
        .set('Cookie', cookie)
        .send({ nombre: 'Categoría no autorizada' })
        .expect(403);

      expect(respuesta.body.mensaje).toContain('Acceso denegado');
    });

    test('mantiene la búsqueda tolerante a mayúsculas y tildes', async () => {
      const { cookie } = await iniciarSesion('dueno@farma.com');
      const respuesta = await request(app)
        .get('/api/productos/autocompletar')
        .query({ busqueda: 'ACIDO FOLICO', limite: 10 })
        .set('Cookie', cookie)
        .expect(200);

      expect(respuesta.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          codigo: 'INT-ACIDO-001',
          nombre_comercial: 'Ácido Fólico CI',
        }),
      ]));
    });
  });
};
