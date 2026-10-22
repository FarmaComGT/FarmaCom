const rateLimit = require('express-rate-limit');
const {
    loginRateLimitMaxAttempts,
    loginRateLimitWindowMs,
} = require('../config/security');

const loginRateLimit = rateLimit({
    windowMs: loginRateLimitWindowMs,
    max: loginRateLimitMaxAttempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.',
    },
});

module.exports = loginRateLimit;
