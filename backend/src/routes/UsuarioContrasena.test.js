jest.mock('../middlewares/verificarToken', () => (req, res, next) => {
    req.usuario = { id_usuario: 90, rol: req.headers['x-test-rol'] || 'dueno' };
    next();
});
jest.mock('../services/UsuarioService');
const express = require('express');
const request = require('supertest');
const service = require('../services/UsuarioService');
const app = express();
app.use(express.json());
app.use('/usuarios', require('./UsuarioRoutes'));
app.use(require('../middlewares/errorHandler'));
const datos = { contrasena_dueno: 'clave-dueno', contrasena_nueva: 'luna bosque rio cobre' };

describe('permisos de restablecimiento', () => {
    beforeEach(() => jest.clearAllMocks());
    it.each(['administrador', 'dependiente', 'laboratorista'])('impide llamadas directas del rol %s', async (rol) => {
        const res = await request(app).patch('/usuarios/90/contrasena').set('x-test-rol', rol).send(datos);
        expect(res.status).toBe(403);
        expect(service.cambiarContrasena).not.toHaveBeenCalled();
    });
    it('permite al dueño cambiar una cuenta ajena', async () => {
        service.cambiarContrasena.mockResolvedValue({ mensaje: 'Contraseña restablecida correctamente.' });
        const res = await request(app).patch('/usuarios/1/contrasena').send(datos);
        expect(res.status).toBe(200);
        expect(service.cambiarContrasena).toHaveBeenCalledWith(1, 'clave-dueno', 'luna bosque rio cobre', { id_usuario: 90, rol: 'dueno' });
    });
    it('rechaza una clave que bcrypt truncaría, sin exponerla en errores', async () => {
        service.cambiarContrasena.mockRejectedValue(new (require('../errors/AppError'))('La contraseña es demasiado larga. Usa una más corta.', 400));
        const clave = 'á'.repeat(40);
        const res = await request(app).patch('/usuarios/1/contrasena').send({ ...datos, contrasena_nueva: clave });
        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).not.toContain(clave);
    });
});
