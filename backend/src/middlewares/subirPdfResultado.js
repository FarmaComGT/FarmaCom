const multer = require('multer');
const AppError = require('../errors/AppError');

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

const filtroPdf = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
        return cb(new AppError('El archivo debe ser un PDF', 400));
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
            return next(new AppError('El archivo supera el tamaño máximo permitido (10 MB)', 400));
        }

        if (error instanceof multer.MulterError) {
            return next(new AppError('No se pudo procesar el archivo adjunto.', 400));
        }

        return next(error);
    });
};

module.exports = subirPdfResultado;
