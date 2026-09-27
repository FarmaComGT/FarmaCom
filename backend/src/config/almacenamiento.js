const fs = require('fs');
const path = require('path');

const RUTA_UPLOADS_RESULTADOS = process.env.RUTA_UPLOADS_RESULTADOS
    || path.join(__dirname, '../../uploads/resultados');

const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || 'http://localhost:3000';

fs.mkdirSync(RUTA_UPLOADS_RESULTADOS, { recursive: true });

module.exports = {
    RUTA_UPLOADS_RESULTADOS,
    PUBLIC_API_BASE_URL,
};
