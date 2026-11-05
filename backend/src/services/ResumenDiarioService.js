const ResumenDiarioDAO = require('../daos/ResumenDiarioDAO');
const AppError = require('../errors/AppError');

const fechaGuatemala = (ahora) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(ahora);

const obtener = async ({ fecha, sucursales } = {}, conexion) => {
  const hoy = fechaGuatemala(new Date());
  const dia = fecha || hoy;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)
      || Number.isNaN(Date.parse(`${dia}T00:00:00Z`))
      || new Date(`${dia}T00:00:00Z`).toISOString().slice(0, 10) !== dia
      || dia > hoy) {
    throw new AppError('La fecha debe ser válida y no puede ser futura', 400);
  }
  if (sucursales !== undefined && (!Array.isArray(sucursales)
      || sucursales.length === 0 || sucursales.length > 100
      || sucursales.some((id) => !Number.isSafeInteger(id) || id < 1 || id > 2147483647))) {
    throw new AppError('Selecciona entre 1 y 100 sucursales válidas', 400);
  }
  const seleccion = sucursales ? [...new Set(sucursales)] : undefined;
  const filtros = { fecha: dia, sucursales: seleccion };
  const datos = await (conexion ? ResumenDiarioDAO.obtener(filtros, conexion) : ResumenDiarioDAO.obtener(filtros));
  if (seleccion && datos.sucursales.length !== seleccion.length) {
    throw new AppError('Una o más sucursales no existen', 404);
  }
  // Los importes se suman en centavos; no se redondea cada operación intermedia.
  const dinero = ['ingresos', 'efectivo', 'tarjeta', 'importe_anulado', 'costo', 'utilidad_bruta'];
  const contadores = ['ventas', 'anulaciones', 'unidades'];
  const resumen = {};
  for (const campo of [...dinero, ...contadores]) {
    const escala = dinero.includes(campo) ? 100 : 1;
    resumen[campo] = datos.sucursales.reduce((total, s) => total + Math.round(Number(s[campo]) * escala), 0) / escala;
  }
  resumen.ticket_promedio = resumen.ventas ? Math.round(resumen.ingresos * 100 / resumen.ventas) / 100 : 0;
  resumen.margen_bruto = resumen.ingresos ? Math.round(resumen.utilidad_bruta / resumen.ingresos * 10000) / 100 : 0;
  resumen.sesiones_abiertas = datos.cajas.filter((c) => c.estado === 'abierta').length;
  resumen.sesiones_cerradas = datos.cajas.filter((c) => c.estado === 'cerrada').length;
  resumen.faltantes = datos.cajas.reduce((total, c) => total + Math.max(0, -Math.round(Number(c.diferencia_efectivo) * 100)), 0) / 100;
  resumen.sobrantes = datos.cajas.reduce((total, c) => total + Math.max(0, Math.round(Number(c.diferencia_efectivo) * 100)), 0) / 100;
  return {
    version: 1, fecha: dia, zona_horaria: 'America/Guatemala', corte: datos.corte,
    estado: resumen.sesiones_abiertas ? 'provisional' : 'sin_cajas_abiertas_al_corte',
    resumen, sucursales: datos.sucursales, productos: datos.productos, cajas: datos.cajas,
  };
};

module.exports = { obtener };
