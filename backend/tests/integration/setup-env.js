process.env.NODE_ENV = 'test';
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_PORT ??= '5432';
process.env.POSTGRES_DB ??= 'farmacom_integration';
process.env.POSTGRES_USER ??= 'postgres';
process.env.POSTGRES_PASSWORD ??= 'postgres';
process.env.JWT_SECRET ??= 'secreto-ficticio-exclusivo-para-integracion';
process.env.JWT_EXPIRES_IN ??= '1h';
