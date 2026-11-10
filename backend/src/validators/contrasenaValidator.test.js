const validar = require('./contrasenaValidator');
describe('política de contraseñas nuevas', () => {
    it.each(['123456', 'passwordpassword', 'FarmaCom123456789', 'AAAAAAAAAAAAAAA', '123456789012345'])('rechaza la clave predecible %s', (clave) => {
        expect(() => validar(clave)).toThrow();
    });
    it('acepta una frase sin exigir números ni símbolos', () => {
        expect(validar('  árbol nube cobre tren  ')).toBe('árbol nube cobre tren');
    });
    it('cuenta caracteres Unicode y limita bytes antes de bcrypt', () => {
        expect(() => validar('😀'.repeat(8))).toThrow(/15 caracteres/);
        expect(() => validar('árbol nube cobre tren '.repeat(5))).toThrow(/demasiado larga/);
    });
    it('no expone la contraseña rechazada en el error', () => {
        try { validar('FarmaCom123456789'); } catch (error) {
            expect(error.status).toBe(400);
            expect(error.message).not.toContain('FarmaCom123456789');
        }
    });
});
