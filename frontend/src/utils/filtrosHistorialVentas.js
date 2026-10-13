const formatearFechaInput = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const esFechaValida = (valor) => {
  const coincidencia = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!coincidencia) return false;
  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  return fecha.getUTCFullYear() === Number(anio)
    && fecha.getUTCMonth() === Number(mes) - 1
    && fecha.getUTCDate() === Number(dia);
};

export const crearFiltrosInicialesHistorial = (fechaReferencia = new Date()) => {
  const fechaHasta = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth(),
    fechaReferencia.getDate(),
  );
  const fechaDesde = new Date(fechaHasta);
  fechaDesde.setDate(fechaDesde.getDate() - 29);

  return {
    id_sucursal: '',
    fecha_desde: formatearFechaInput(fechaDesde),
    fecha_hasta: formatearFechaInput(fechaHasta),
  };
};

export const validarFiltrosHistorial = (filtros = {}) => {
  if (!filtros.fecha_desde || !filtros.fecha_hasta) {
    return 'Selecciona una fecha inicial y una fecha final.';
  }
  if (!esFechaValida(filtros.fecha_desde) || !esFechaValida(filtros.fecha_hasta)) {
    return 'Ingresa un rango de fechas válido.';
  }
  if (filtros.fecha_desde > filtros.fecha_hasta) {
    return 'La fecha inicial no puede ser posterior a la fecha final.';
  }
  if (filtros.id_sucursal !== '' && (
    !Number.isInteger(Number(filtros.id_sucursal)) || Number(filtros.id_sucursal) < 1
  )) {
    return 'Selecciona una sucursal válida.';
  }
  return null;
};

export const prepararFiltrosHistorial = (filtros) => ({
  ...filtros,
  id_sucursal: filtros.id_sucursal === '' ? '' : Number(filtros.id_sucursal),
});
