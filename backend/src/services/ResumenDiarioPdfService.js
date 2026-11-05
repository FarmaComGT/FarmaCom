const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const moneda = (valor) => new Intl.NumberFormat('es-GT', {
  style: 'currency', currency: 'GTQ', minimumFractionDigits: 2,
}).format(Number(valor || 0));
const numero = (valor) => new Intl.NumberFormat('es-GT').format(Number(valor || 0));

// Recibe la misma copia de datos para descargas y adjuntos.
const generar = async (reporte) => {
  const doc = await PDFDocument.create();
  doc.setTitle(`FarmaCom - Resumen diario ${reporte.fecha}`);
  doc.setAuthor('FarmaCom');
  doc.setLanguage('es-GT');
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const tinta = rgb(0.10, 0.17, 0.18);
  const secundario = rgb(0.32, 0.39, 0.40);
  const acento = rgb(0.04, 0.36, 0.29);
  const fondo = rgb(0.94, 0.97, 0.96);
  const borde = rgb(0.85, 0.89, 0.88);
  const margen = 40;
  const ancho = 515;
  let pagina;
  let y;
  const seguro = (valor) => Array.from(String(valor ?? '').normalize('NFC')).map((c) => {
    if (/\s/.test(c)) return ' ';
    try { regular.encodeText(c); return c; } catch { return '?'; }
  }).join('');
  const texto = (valor, x, base, { size = 10, bold = false, color = tinta, right = false } = {}) => {
    const font = bold ? negrita : regular;
    const contenido = seguro(valor);
    pagina.drawText(contenido, {
      x: right ? x - font.widthOfTextAtSize(contenido, size) : x,
      y: base, font, size, color,
    });
  };
  const lineas = (valor, width, size = 10, bold = false) => {
    const font = bold ? negrita : regular;
    const resultado = [];
    let linea = '';
    for (const palabra of seguro(valor).split(' ')) {
      const candidato = linea ? `${linea} ${palabra}` : palabra;
      if (font.widthOfTextAtSize(candidato, size) <= width) { linea = candidato; continue; }
      if (linea) resultado.push(linea);
      linea = '';
      for (const c of palabra) {
        if (font.widthOfTextAtSize(linea + c, size) > width) { resultado.push(linea); linea = ''; }
        linea += c;
      }
    }
    if (linea) resultado.push(linea);
    return resultado.length ? resultado : [''];
  };
  const nuevaPagina = () => {
    pagina = doc.addPage([595, 842]);
    texto('FarmaCom', margen, 798, { size: 18, bold: true, color: acento });
    texto('Reporte de ventas', 555, 800, { right: true, size: 9, color: secundario });
    texto(reporte.fecha, 555, 784, { right: true, size: 10, bold: true });
    pagina.drawLine({ start: { x: margen, y: 771 }, end: { x: 555, y: 771 }, thickness: 0.6, color: borde });
    y = 744;
  };
  const espacio = (alto) => { if (y - alto < 58) nuevaPagina(); };
  const parrafo = (valor, size = 9) => {
    for (const linea of lineas(valor, ancho, size)) {
      espacio(size + 5); texto(linea, margen, y, { size, color: secundario }); y -= size + 5;
    }
  };
  const seccion = (titulo, subtitulo) => {
    espacio(130); y -= 20;
    texto(titulo, margen, y, { size: 15, bold: true }); y -= 20;
    if (subtitulo) { parrafo(subtitulo); y -= 3; }
  };
  // Filas variables, cifras a la derecha y encabezados repetidos al paginar.
  const tabla = (titulo, columnas, filas, vacio) => {
    const cabecera = (continuacion = false) => {
      if (continuacion) { texto(`${titulo} (continuación)`, margen, y, { size: 13, bold: true }); y -= 27; }
      let x = margen;
      for (const c of columnas) {
        texto(c.titulo, c.right ? x + c.width - 6 : x, y, { size: 8, color: secundario, right: c.right });
        x += c.width;
      }
      y -= 10;
      pagina.drawLine({ start: { x: margen, y }, end: { x: 555, y }, thickness: 0.6, color: borde });
      y -= 18;
    };
    cabecera();
    if (!filas.length) { parrafo(vacio); return; }
    for (const fila of filas) {
      const celdas = columnas.map((c, i) => lineas(fila[i], c.width - 12, 9, i === 0));
      const alto = Math.max(...celdas.map((c) => c.length));
      let indice = 0;
      while (indice < alto) {
        if (y - 28 < 58) { nuevaPagina(); cabecera(true); }
        const restantes = alto - indice;
        // Conserva juntas las filas normales; divide las que exceden una página.
        if (restantes * 13 + 14 <= 620 && y - (restantes * 13 + 14) < 58) {
          nuevaPagina(); cabecera(true);
        }
        const cantidad = Math.min(restantes, Math.max(1, Math.floor((y - 72) / 13)));
        let x = margen;
        columnas.forEach((c, i) => {
          celdas[i].slice(indice, indice + cantidad).forEach((linea, n) => {
            texto(linea, c.right ? x + c.width - 6 : x, y - n * 13,
              { size: 9, bold: i === 0, right: c.right });
          });
          x += c.width;
        });
        y -= cantidad * 13 + 11;
        pagina.drawLine({ start: { x: margen, y: y + 3 }, end: { x: 555, y: y + 3 }, thickness: 0.4, color: borde });
        indice += cantidad;
      }
    }
  };
  nuevaPagina();
  const r = reporte.resumen;
  const provisional = reporte.estado === 'provisional';
  texto('Resumen del día', margen, y, { size: 26, bold: true }); y -= 23;
  const corte = new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(reporte.corte));
  parrafo(`Corte: ${corte} · Hora de Guatemala`);
  y -= 5;
  pagina.drawRectangle({ x: margen, y: y - 42, width: ancho, height: 48, color: fondo });
  texto(provisional ? 'Provisional · Cajas pendientes de cierre' : 'Sin cajas abiertas al corte', margen + 12, y - 10,
    { size: 10, bold: true, color: acento });
  texto(provisional ? 'Incluye ventas de cajas abiertas. Los resultados pueden cambiar.' : 'Los resultados reflejan este corte; pueden existir operaciones posteriores.',
    margen + 12, y - 27, { size: 9, color: secundario });
  y -= 65;
  texto('Total vendido', margen, y, { size: 10, color: secundario }); y -= 35;
  const total = moneda(r.ingresos);
  const tamanoTotal = Math.min(32, 280 / negrita.widthOfTextAtSize(total, 1));
  texto(total, margen, y, { size: tamanoTotal, bold: true, color: acento });
  texto('Utilidad bruta', 346, y + 28, { size: 10, color: secundario });
  const utilidad = moneda(r.utilidad_bruta);
  texto(utilidad, 346, y + 5, { size: Math.min(22, 209 / negrita.widthOfTextAtSize(utilidad, 1)), bold: true });
  texto(`Margen bruto: ${numero(r.margen_bruto)} %`, 346, y - 13, { size: 9, color: secundario });
  y -= 42;
  [['Ventas completadas', numero(r.ventas)], ['Unidades vendidas', numero(r.unidades)], ['Ticket promedio', moneda(r.ticket_promedio)]]
    .forEach(([label, value], i) => {
      texto(label, margen + i * 176, y, { size: 9, color: secundario });
      texto(value, margen + i * 176, y - 22, { size: Math.min(18, 163 / negrita.widthOfTextAtSize(value, 1)), bold: true });
    });
  y -= 44;
  if (!Number(r.ventas)) parrafo('Sin ventas completadas registradas en el período.');
  parrafo(`Efectivo: ${moneda(r.efectivo)}   ·   Tarjeta: ${moneda(r.tarjeta)}   ·   Costo vendido: ${moneda(r.costo)}`);
  parrafo(`Ventas del período anuladas al corte: ${numero(r.anulaciones)}   ·   Importe: ${moneda(r.importe_anulado)}`);
  parrafo('La utilidad bruta no descuenta salarios, alquiler ni otros gastos operativos.');
  seccion('Desempeño por sucursal');
  tabla('Desempeño por sucursal', [
    { titulo: 'Sucursal', width: 217 }, { titulo: 'Ventas', width: 55, right: true },
    { titulo: 'Total vendido', width: 119, right: true }, { titulo: 'Utilidad bruta', width: 124, right: true },
  ], reporte.sucursales.map((s) => [s.nombre_sucursal, numero(s.ventas), moneda(s.ingresos), moneda(s.utilidad_bruta)]),
  'No hay sucursales para mostrar.');
  seccion('Productos más vendidos', 'Hasta cinco productos, ordenados por unidades vendidas.');
  tabla('Productos más vendidos', [
    { titulo: 'Producto', width: 315 }, { titulo: 'Unidades', width: 76, right: true },
    { titulo: 'Importe vendido', width: 124, right: true },
  ], reporte.productos.map((p) => [p.nombre_comercial, numero(p.unidades), moneda(p.ingresos)]),
  'Sin productos vendidos en el período.');
  seccion('Control de caja', `${numero(r.sesiones_abiertas)} sesiones abiertas · ${numero(r.sesiones_cerradas)} cerradas`);
  parrafo(`Faltantes: ${moneda(r.faltantes)}   ·   Sobrantes: ${moneda(r.sobrantes)}`);
  parrafo('Las diferencias corresponden a sesiones cerradas; no se compensan entre sí.');
  y -= 10;
  tabla('Control de caja', [
    { titulo: 'Sucursal / Caja / Sesión', width: 217 }, { titulo: 'Esperado', width: 99, right: true },
    { titulo: 'Contado', width: 99, right: true }, { titulo: 'Diferencia', width: 100, right: true },
  ], reporte.cajas.map((c) => {
    const s = reporte.sucursales.find((item) => item.id_sucursal === c.id_sucursal);
    const abierta = c.estado === 'abierta';
    return [`${s?.nombre_sucursal || 'Sucursal'} / ${c.nombre_caja} / #${c.id_sesion_caja} · ${c.turno} · ${String(c.fecha_operacion).slice(0, 10)} · ${abierta ? 'Abierta' : 'Cerrada'}`,
      abierta ? 'Pendiente' : moneda(c.efectivo_esperado), abierta ? 'Pendiente' : moneda(c.efectivo_contado),
      abierta ? 'Pendiente' : moneda(c.diferencia_efectivo)];
  }), 'Sin sesiones de caja registradas para el período.');
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    pagina = p;
    texto('FarmaCom · Resumen diario de ventas', margen, 29, { size: 8, color: secundario });
    texto(`${i + 1} / ${paginas.length}`, 555, 29, { size: 8, right: true, color: secundario });
  });
  return Buffer.from(await doc.save());
};

module.exports = { generar };
