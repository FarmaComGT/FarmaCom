import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Paginacion.module.css';

const numero = new Intl.NumberFormat('es-GT');

// El consumidor decide los parámetros de URL y obtiene los totales del servidor.
export default function Paginacion({ paginacion, crearDestino, onLimiteChange,
  cargando = false, etiqueta = 'Paginación', controles = 'listado' }) {
  if (!paginacion) return null;
  const { pagina, limite, total_paginas } = paginacion;
  const enlace = (destino, texto, icono, inactivo) => inactivo || cargando
    ? <span className={styles.link} role="link" aria-disabled="true" aria-label={texto}>{icono}</span>
    : <Link className={styles.link} to={crearDestino(destino)} aria-controls={controles} aria-label={texto}>{icono}</Link>;
  return (
    <nav className={styles.pagination} aria-label={etiqueta} aria-busy={cargando}>
      <div className={styles.controls}>
        <label className={styles.size}>Por página
          <select name="limite" value={limite} onChange={(evento) => onLimiteChange(Number(evento.target.value))} disabled={cargando} aria-controls={controles}>
            {[10, 25, 50].map((valor) => <option key={valor} value={valor}>{valor}</option>)}
          </select>
        </label>
        <div className={styles.pages}>
          {enlace(pagina - 1, 'Anterior', <ChevronLeft size={13} aria-hidden="true" />, pagina <= 1)}
          <span className={styles.current}>pág {numero.format(pagina)} de {numero.format(total_paginas)}</span>
          {enlace(pagina + 1, 'Siguiente', <ChevronRight size={13} aria-hidden="true" />, pagina >= total_paginas)}
        </div>
      </div>
    </nav>
  );
}
