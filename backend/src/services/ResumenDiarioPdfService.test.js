const { PDFDocument } = require('pdf-lib');
const { generar } = require('./ResumenDiarioPdfService');

const ejemplo = (cantidad = 0) => ({
  fecha: '2026-11-04', corte: '2026-11-05T02:00:00Z', estado: 'provisional',
  resumen: { ingresos: 1523.5, ventas: 20, unidades: 50, ticket_promedio: 76.18,
    efectivo: 1000, tarjeta: 523.5, costo: 800, utilidad_bruta: 723.5, margen_bruto: 47.49,
    anulaciones: 1, importe_anulado: 50, sesiones_abiertas: 1, sesiones_cerradas: 0, faltantes: 0, sobrantes: 0 },
  sucursales: Array.from({ length: cantidad }, (_, i) => ({ id_sucursal: i + 1,
    nombre_sucursal: i === 0 ? 'San Gabriel - Atención y gestión farmacéutica' : `Sucursal ${i + 1} ${'Nombre extenso '.repeat(12)}`,
    ingresos: 1523.5, ventas: 20, unidades: 50, utilidad_bruta: 723.5, efectivo: 1000, tarjeta: 523.5 })),
  productos: [{ nombre_comercial: 'Ácido acetilsalicílico', unidades: 50, ingresos: 1523.5 }],
  cajas: [{ id_sucursal: 1, nombre_caja: 'Caja principal', id_sesion_caja: 1,
    turno: 'mañana', fecha_operacion: '2026-11-04', estado: 'abierta', diferencia_efectivo: null }],
});

test('genera un PDF válido con metadatos en español', async () => {
  const buffer = await generar(ejemplo(1));
  const doc = await PDFDocument.load(buffer);
  expect(doc.getTitle()).toContain('2026-11-04');
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
});
test('pagina reportes extensos y soporta nombres sin espacios o caracteres no latinos', async () => {
  const reporte = ejemplo(40);
  reporte.sucursales[0].nombre_sucursal = '漢字 💊 ' + 'A'.repeat(700);
  const doc = await PDFDocument.load(await generar(reporte));
  expect(doc.getPageCount()).toBeGreaterThan(3);
});
test('genera el estado sin ventas y sin cajas', async () => {
  const reporte = ejemplo();
  reporte.resumen = {}; reporte.productos = []; reporte.cajas = [];
  reporte.estado = 'sin_cajas_abiertas_al_corte';
  expect((await PDFDocument.load(await generar(reporte))).getPageCount()).toBeGreaterThan(0);
});

test('divide una sola fila de varias páginas sin perder la capacidad de generar el documento', async () => {
  const reporte = ejemplo(1);
  reporte.sucursales[0].nombre_sucursal = 'Sucursal ' + 'Nombre muy extenso '.repeat(500);
  reporte.resumen.ingresos = 999999999999.99;
  const doc = await PDFDocument.load(await generar(reporte));
  expect(doc.getPageCount()).toBeGreaterThan(2);
});

test('admite cierres con faltantes y utilidad negativa', async () => {
  const reporte = ejemplo(1);
  reporte.estado = 'sin_cajas_abiertas_al_corte';
  reporte.resumen.utilidad_bruta = -100;
  reporte.resumen.margen_bruto = -6.56;
  Object.assign(reporte.cajas[0], {
    estado: 'cerrada', efectivo_esperado: 1000, efectivo_contado: 900, diferencia_efectivo: -100,
  });
  const doc = await PDFDocument.load(await generar(reporte));
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
});

module.exports = { ejemplo };
