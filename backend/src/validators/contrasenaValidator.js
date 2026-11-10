const AppError = require('../errors/AppError');

// Lista local deliberadamente limitada: no sustituye un catálogo de filtraciones.
const COMUNES = new Set([
    '123456', 'password', 'contraseña', 'contrasena', 'qwerty', 'admin',
    '123456789012345', '1234567890123456', '12345678901234567',
    '123456789012345678', '1234567890123456789', '12345678901234567890',
    '123456789123456789', '123456789123456', 'passwordpassword',
    'passwordpassword1', 'passwordpassword123', 'password123456789',
    'password1234567890', 'qwertyuiopasdfgh', 'qwertyuiopasdfghjkl',
    'qwertyuiop123456', 'asdfghjklqwertyuiop', 'iloveyouiloveyou',
    'contraseñacontraseña', 'contrasenacontrasena', 'administrador123',
    'administrador1234', 'administrador12345', 'abcdefghijklmnop', 'farmacomfarmacom',
]);

const validarContrasena = (valor) => {
    if (typeof valor !== 'string' || [...valor.trim()].length < 15) {
        throw new AppError('La contraseña debe tener al menos 15 caracteres.', 400);
    }
    const contrasena = valor.trim();
    if (Buffer.byteLength(contrasena, 'utf8') > 72) {
        throw new AppError('La contraseña es demasiado larga. Usa una más corta.', 400);
    }
    const comparable = contrasena.toLocaleLowerCase('es');
    const varianteFarmaCom = /^farma[\s_-]*com[\s\d!@#$%._-]*$/i.test(comparable);
    if (COMUNES.has(comparable) || varianteFarmaCom || /^(.)\1+$/u.test(contrasena)) {
        throw new AppError('Esta contraseña es demasiado común o predecible. Usa una frase larga y única.', 400);
    }
    return contrasena;
};

module.exports = validarContrasena;
