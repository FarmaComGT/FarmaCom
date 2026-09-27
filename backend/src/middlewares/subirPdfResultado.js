const multer = require('multer');

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

const filtroPdf = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
        const error = new Error('El archivo debe ser un PDF');
        error.status = 400;
        return cb(error);
    }
    cb(null, true);
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_BYTES },
    fileFilter: filtroPdf,
}).single('archivo');

// Envuelve multer.single(...) para responder JSON consistente con el resto
// de la API en vez de dejar que Express muestre su página de error por defecto.
const subirPdfResultado = (req, res, next) => {
    upload(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ mensaje: 'El archivo supera el tamaño máximo permitido (10 MB)' });
        }

        return res.status(error.status || 400).json({ mensaje: error.message });
    });
};

module.exports = subirPdfResultado;
