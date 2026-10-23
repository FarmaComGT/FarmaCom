module.exports = ({ app, iniciarSesion, request }) => {
  describe('Integración de autenticación', () => {
    test('autentica un usuario real y devuelve su sesión desde PostgreSQL', async () => {
      const { respuesta } = await iniciarSesion('dueno@farma.com');

      expect(respuesta.body.usuario).toMatchObject({
        correo_usuario: 'dueno@farma.com',
        rol: 'dueno',
      });
    });

    test('rechaza una contraseña incorrecta sin revelar si el usuario existe', async () => {
      const credenciales = { contrasena: 'contrasena-incorrecta' };
      const usuarioExistente = await request(app)
        .post('/api/auth/login')
        .send({ ...credenciales, correo_usuario: 'dueno@farma.com' })
        .expect(401);
      const usuarioInexistente = await request(app)
        .post('/api/auth/login')
        .send({ ...credenciales, correo_usuario: 'nadie@farma.com' })
        .expect(401);

      expect(usuarioExistente.body).toEqual(usuarioInexistente.body);
      expect(usuarioExistente.body.mensaje).toBe('Credenciales inválidas');
    });

    test('conserva la cookie httpOnly al iniciar sesión correctamente', async () => {
      const { respuesta } = await iniciarSesion('dueno@farma.com');
      const cookie = respuesta.headers['set-cookie'][0];

      expect(cookie).toContain('auth_token=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });
  });
};
