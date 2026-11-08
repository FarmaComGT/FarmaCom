const AppError = require('../errors/AppError');

// Primera etapa: identificadores simples (EAN/UPC/Code 128), sin campos GS1.
const normalizarCodigoBarras = (valor, { opcional = false } = {}) => {
  if (opcional && (valor === null || valor === undefined || valor === '')) return null;
  if (typeof valor !== 'string') {
    throw new AppError('El código de barras debe ser texto.', 400);
  }
  const codigo = valor.trim();
  if (opcional && !codigo) return null;
  if (!/^[\x21-\x7E]{1,64}$/.test(codigo)) {
    throw new AppError('El código de barras debe contener de 1 a 64 caracteres visibles, sin espacios.', 400);
  }
  return codigo;
};

module.exports = { normalizarCodigoBarras };
