const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;

  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();

  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const noHaCumplidoAnosEsteAno = (
    hoy.getUTCMonth() < nacimiento.getUTCMonth()
    || (hoy.getUTCMonth() === nacimiento.getUTCMonth() && hoy.getUTCDate() < nacimiento.getUTCDate())
  );

  if (noHaCumplidoAnosEsteAno) edad -= 1;

  return edad;
};

module.exports = { calcularEdad };
