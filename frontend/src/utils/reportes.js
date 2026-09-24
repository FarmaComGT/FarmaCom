const FORMATO_MONEDA = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATO_NUMERO = new Intl.NumberFormat('es-GT');

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-GT', {
  style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export const formatearMargen = (valor) => (
  FORMATO_PORCENTAJE.format(normalizarNumeroReporte(valor) / 100)
);

export const normalizarRentabilidad = (datos) => (
  Array.isArray(datos) ? datos.map((sucursal) => ({
    ...sucursal,
    id_sucursal: normalizarNumeroReporte(sucursal.id_sucursal),
    ingresos: normalizarNumeroReporte(sucursal.ingresos),
    costo: normalizarNumeroReporte(sucursal.costo),
    utilidad: normalizarNumeroReporte(sucursal.utilidad),
    margen: normalizarNumeroReporte(sucursal.margen),
  })) : []
);

export const resumirRentabilidad = (datos = []) => {
  const totales = datos.reduce((total, sucursal) => ({
    ingresos: total.ingresos + sucursal.ingresos,
    costo: total.costo + sucursal.costo,
    utilidad: total.utilidad + sucursal.utilidad,
  }), { ingresos: 0, costo: 0, utilidad: 0 });

  return {
    ...totales,
    margen: totales.ingresos === 0 ? 0 : totales.utilidad / totales.ingresos * 100,
  };
};

const FORMATO_FECHA = new Intl.DateTimeFormat('es-GT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const FORMATO_MES = new Intl.DateTimeFormat('es-GT', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const obtenerFechaReporte = (valor) => {
  const coincidencia = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!coincidencia) return null;

  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  const esFechaValida = fecha.getUTCFullYear() === Number(anio)
    && fecha.getUTCMonth() === Number(mes) - 1
    && fecha.getUTCDate() === Number(dia);

  return esFechaValida ? fecha : null;
};

export const normalizarNumeroReporte = (valor, valorPredeterminado = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : valorPredeterminado;
};

export const formatearMoneda = (valor) => (
  FORMATO_MONEDA.format(normalizarNumeroReporte(valor))
);

export const formatearNumero = (valor) => (
  FORMATO_NUMERO.format(normalizarNumeroReporte(valor))
);

export const formatearFechaReporte = (valor) => {
  const fecha = obtenerFechaReporte(valor);
  return fecha ? FORMATO_FECHA.format(fecha) : '—';
};

export const formatearPeriodoReporte = (valor, agrupacion = 'dia') => {
  const fecha = obtenerFechaReporte(valor);
  if (!fecha) return '—';

  if (agrupacion === 'mes') {
    return FORMATO_MES.format(fecha).replace('.', '');
  }

  return FORMATO_FECHA.format(fecha).slice(0, 5);
};

export const normalizarResumenVentas = (resumen = {}) => ({
  ingresos_totales: normalizarNumeroReporte(resumen.ingresos_totales),
  total_ventas: normalizarNumeroReporte(resumen.total_ventas),
  ticket_promedio: normalizarNumeroReporte(resumen.ticket_promedio),
  unidades_vendidas: normalizarNumeroReporte(resumen.unidades_vendidas),
});

export const normalizarSerieVentas = (periodos) => (
  Array.isArray(periodos)
    ? periodos.map((periodo) => ({
      ...periodo,
      ingresos: normalizarNumeroReporte(periodo.ingresos),
      total_ventas: normalizarNumeroReporte(periodo.total_ventas),
      ticket_promedio: normalizarNumeroReporte(periodo.ticket_promedio),
      unidades_vendidas: normalizarNumeroReporte(periodo.unidades_vendidas),
    }))
    : []
);

export const normalizarMetodosPago = (metodos) => (
  Array.isArray(metodos)
    ? metodos.map((metodo) => ({
      ...metodo,
      total_ventas: normalizarNumeroReporte(metodo.total_ventas),
      ingresos: normalizarNumeroReporte(metodo.ingresos),
      porcentaje_ingresos: normalizarNumeroReporte(metodo.porcentaje_ingresos),
    }))
    : []
);

export const normalizarTopProductos = (productos) => (
  Array.isArray(productos)
    ? productos.map((producto) => ({
      ...producto,
      id_producto: normalizarNumeroReporte(producto.id_producto),
      cantidad_vendida: normalizarNumeroReporte(producto.cantidad_vendida),
      ingresos_generados: normalizarNumeroReporte(producto.ingresos_generados),
    }))
    : []
);
