class AppError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = AppError;
