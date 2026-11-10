import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, MoreVertical } from 'lucide-react';
import management from '../../styles/ManagementUI.module.css';
import MenuFlotante from './MenuFlotante.jsx';
import styles from './MenuAcciones.module.css';

const ITEMS = 'button:not(:disabled)';

function ListaAcciones({ etiqueta, acciones, onElegir, onSalirConTab }) {
  const lista = useRef(null);

  // Al abrir, el foco entra al menú para poder recorrerlo con el teclado.
  useEffect(() => { lista.current?.querySelector(ITEMS)?.focus(); }, []);

  const alPresionarTecla = (evento) => {
    if (evento.key === 'Tab') { onSalirConTab(); return; }
    const items = [...lista.current.querySelectorAll(ITEMS)];
    if (!items.length) return;
    const actual = items.indexOf(document.activeElement);
    const destinos = {
      ArrowDown: items[(actual + 1) % items.length],
      ArrowUp: items[(actual - 1 + items.length) % items.length],
      Home: items[0],
      End: items[items.length - 1],
    };
    if (!destinos[evento.key]) return;
    evento.preventDefault();
    destinos[evento.key].focus();
  };

  return (
    <div ref={lista} role="group" aria-label={etiqueta} onKeyDown={alPresionarTecla}>
      {acciones.map(({ clave, etiqueta: texto, icono: Icono, peligro, deshabilitada, separadorAntes }) => (
        <React.Fragment key={clave}>
          {separadorAntes && <div className={styles.separator} />}
          <button
            type="button"
            disabled={deshabilitada}
            onClick={() => onElegir(clave)}
            className={`${styles.item} ${peligro ? styles.danger : ''}`.trim()}
          >
            {Icono && <Icono size={14} aria-hidden="true" />}
            {texto}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Botón de tres puntos que despliega las acciones de una fila sobre cualquier contenedor.
 *
 * `acciones`: [{ clave, etiqueta, icono, onClick, peligro, deshabilitada, oculta, separadorAntes }]
 * Se adapta a la cantidad de acciones visibles; si no hay ninguna, no renderiza nada.
 * `etiqueta`: nombre accesible del botón, p. ej. "Más acciones para Caja principal".
 * `ocupado`: muestra un spinner en el botón mientras una acción de la fila está en curso.
 */
export default function MenuAcciones({ etiqueta, acciones, ocupado = false, claseBoton }) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef(null);
  const idMenu = useId();
  const visibles = acciones.filter((accion) => !accion.oculta);

  if (visibles.length === 0) return null;

  const cerrar = () => setAbierto(false);
  const elegir = (clave) => {
    cerrar();
    // El foco vuelve al botón antes de ejecutar la acción: si abre un diálogo, éste
    // lo recordará y lo devolverá aquí al cerrarse.
    botonRef.current?.focus();
    visibles.find((accion) => accion.clave === clave)?.onClick();
  };
  const salirConTab = () => { cerrar(); botonRef.current?.focus(); };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        disabled={ocupado}
        aria-label={etiqueta}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-busy={ocupado || undefined}
        className={claseBoton || `${management.button} ${management.iconButton}`}
      >
        {ocupado
          ? <LoaderCircle size={14} className={styles.spinner} aria-hidden="true" />
          : <MoreVertical size={14} aria-hidden="true" />}
      </button>

      <MenuFlotante anclaRef={botonRef} abierto={abierto} onCerrar={cerrar} id={idMenu}>
        <ListaAcciones etiqueta={etiqueta} acciones={visibles} onElegir={elegir} onSalirConTab={salirConTab} />
      </MenuFlotante>
    </>
  );
}
