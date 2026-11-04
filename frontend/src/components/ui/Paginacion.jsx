import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Paginacion.module.css';

const numero = new Intl.NumberFormat('es-GT');

// El consumidor decide los parámetros de URL y obtiene los totales del servidor.
export default function Paginacion({ paginacion, crearDestino, onLimiteChange,
  cargando = false, sustantivo = 'resultados', etiqueta = 'Paginación', controles = 'listado' }) {
  if (!paginacion) return null;
  const { pagina, limite, total, total_paginas } = paginacion;
  const inicio = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const fin = Math.min(pagina * limite, total);
  const enlace = (destino, texto, icono, inactivo) => inactivo || cargando
    ? <span className={styles.link} aria-disabled="true">{icono}{texto}</span>
    : <Link className={styles.link} to={crearDestino(destino)} aria-controls={controles}>{icono}{texto}</Link>;
  return (
    <nav className={styles.pagination} aria-label={etiqueta} aria-busy={cargando}>
      <p className={styles.range} aria-live="polite" aria-atomic="true">
        {cargando ? 'Cargando…' : `${numero.format(inicio)}–${numero.format(fin)} de ${numero.format(total)} ${sustantivo}`}
      </p>
      <div className={styles.controls}>
        <label className={styles.size}>Por página
          <select name="limite" value={limite} onChange={(evento) => onLimiteChange(Number(evento.target.value))} disabled={cargando} aria-controls={controles}>
            {[10, 25, 50].map((valor) => <option key={valor} value={valor}>{valor}</option>)}
          </select>
        </label>
        <div className={styles.pages}>
          {enlace(pagina - 1, 'Anterior', <ChevronLeft size={16} aria-hidden="true" />, pagina <= 1)}
          <span className={styles.current}>Página {numero.format(pagina)} de {numero.format(total_paginas)}</span>
          {enlace(pagina + 1, 'Siguiente', <ChevronRight size={16} aria-hidden="true" />, pagina >= total_paginas)}
        </div>
      </div>
    </nav>
  );
}
