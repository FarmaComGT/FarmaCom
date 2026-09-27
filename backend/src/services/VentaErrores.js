const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

module.exports = { lanzarError };
