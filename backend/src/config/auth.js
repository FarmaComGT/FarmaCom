const DEFAULT_TOKEN_EXPIRY = '8h';

const DURATION_UNITS_IN_MS = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
};

const parseDurationToMs = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value * 1000;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();

    if (/^\d+$/.test(trimmedValue)) {
        return Number(trimmedValue) * 1000;
    }

    const match = trimmedValue.match(/^(\d+)\s*(ms|s|m|h|d|w)$/i);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    return amount * DURATION_UNITS_IN_MS[unit];
};

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || DEFAULT_TOKEN_EXPIRY;
const TOKEN_EXPIRY_MS = parseDurationToMs(TOKEN_EXPIRY) ?? parseDurationToMs(DEFAULT_TOKEN_EXPIRY);
const COOKIE_NAME = 'auth_token';

const buildAuthCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_EXPIRY_MS,
});

const buildAuthCookieClearOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
});

module.exports = {
    COOKIE_NAME,
    TOKEN_EXPIRY,
    TOKEN_EXPIRY_MS,
    buildAuthCookieOptions,
    buildAuthCookieClearOptions,
};
