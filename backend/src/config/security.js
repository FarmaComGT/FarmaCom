const DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const MAX_TRUST_PROXY_HOPS = 10;

const parseIntegerInRange = (value, { name, defaultValue, min, max }) => {
    if (value === undefined || value === null || String(value).trim() === '') {
        return defaultValue;
    }

    const normalized = String(value).trim();
    if (!/^\d+$/.test(normalized)) {
        throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
    }

    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
    }

    return parsed;
};

const parseSecurityConfig = (env = process.env) => ({
    trustProxyHops: parseIntegerInRange(env.TRUST_PROXY_HOPS, {
        name: 'TRUST_PROXY_HOPS',
        defaultValue: 0,
        min: 0,
        max: MAX_TRUST_PROXY_HOPS,
    }),
    loginRateLimitWindowMs: parseIntegerInRange(env.LOGIN_RATE_LIMIT_WINDOW_MS, {
        name: 'LOGIN_RATE_LIMIT_WINDOW_MS',
        defaultValue: DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS,
        min: 1000,
        max: 24 * 60 * 60 * 1000,
    }),
    loginRateLimitMaxAttempts: parseIntegerInRange(env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS, {
        name: 'LOGIN_RATE_LIMIT_MAX_ATTEMPTS',
        defaultValue: DEFAULT_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
        min: 1,
        max: 100,
    }),
});

const securityConfig = parseSecurityConfig();

module.exports = {
    ...securityConfig,
    parseSecurityConfig,
};
