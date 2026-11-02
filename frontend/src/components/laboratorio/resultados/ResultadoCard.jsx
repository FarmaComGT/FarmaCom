import React, { useState } from 'react';
import { Ban, Eye, FileText, MoreVertical } from 'lucide-react';
import { construirUrlPublica } from '../../../api/resultadosLaboratorio';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

const formatearFecha = (fecha) => new Intl.DateTimeFormat('es-GT').format(new Date(fecha));

export default function ResultadoCard({ resultado, origen = 'servidor', onAnular, onVerLocal }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const anulado = resultado.estado === 'anulado';
  const soloLocal = origen === 'solo-local';
  const menuId = `resultado-menu-${resultado.id_resultado}`;

  const verDescargar = () => {
    if (soloLocal) {
      onVerLocal?.();
      return;
    }
    window.open(construirUrlPublica(resultado.token_publico), '_blank', 'noopener');
  };

  const estado = soloLocal
    ? { etiqueta: 'Solo local', clase: laboratory.statusLocal }
    : anulado
      ? { etiqueta: 'Anulado', clase: laboratory.statusDanger }
      : resultado.vigente
        ? { etiqueta: 'Vigente', clase: laboratory.statusActive }
        : { etiqueta: 'Expirado', clase: laboratory.statusWarning };

  return (
    <article className={laboratory.resultCard}>
      <button type="button" onClick={verDescargar} disabled={anulado} aria-label={`Ver o descargar resultado de ${resultado.categoria}`} className={laboratory.resultOpen}>
        <span className={laboratory.resultIcon}><FileText size={21} aria-hidden="true" /></span>
        <span className={laboratory.resultText}><strong>{resultado.categoria}</strong><span>{formatearFecha(resultado.fecha_subida)}</span></span>
      </button>

      <div className={laboratory.resultBadges}>
        <span className={`${laboratory.status} ${estado.clase}`}>{estado.etiqueta}</span>
        {origen === 'servidor-local' && <span className={`${laboratory.status} ${laboratory.statusLocal}`}>Respaldo local</span>}
      </div>

      {!anulado && !soloLocal && (
        <div className={`${laboratory.resultActions} ${laboratory.menuWrap}`}>
          <button type="button" onClick={() => setMenuAbierto((actual) => !actual)} aria-label={`Más acciones para ${resultado.categoria}`} aria-expanded={menuAbierto} aria-controls={menuId} className={`${management.button} ${management.iconButton}`}>
            <MoreVertical size={15} aria-hidden="true" />
          </button>
          {menuAbierto && (
            <div id={menuId} className={laboratory.menu}>
              <button type="button" onClick={() => { setMenuAbierto(false); verDescargar(); }} className={laboratory.menuItem}><Eye size={15} aria-hidden="true" /> Ver / Descargar</button>
              <button type="button" onClick={() => { setMenuAbierto(false); onAnular(resultado); }} className={`${laboratory.menuItem} ${laboratory.menuDanger}`}><Ban size={15} aria-hidden="true" /> Anular / Reemplazar</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
