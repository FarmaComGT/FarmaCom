import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MenuFlotante.module.css';

// Menú desplegable que se renderiza en un portal sobre <body>, posicionado con
// coordenadas de viewport (no relativas a su contenedor). Así puede abrirse dentro
// de una tabla o lista con scroll propio sin quedar recortado ni empujar un scroll
// interno: se sobrepone a todo, como cualquier menú flotante nativo.
export default function MenuFlotante({ anclaRef, abierto, onCerrar, id, className = '', children }) {
  const menuRef = useRef(null);
  const [posicion, setPosicion] = useState(null);

  useLayoutEffect(() => {
    if (!abierto) { setPosicion(null); return undefined; }

    const ubicar = () => {
      const rect = anclaRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosicion({ top: rect.bottom + 5, right: window.innerWidth - rect.right });
    };

    ubicar();
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => {
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', ubicar, true);
    };
  }, [abierto, anclaRef]);

  useEffect(() => {
    if (!abierto) return undefined;

    const alHacerClic = (evento) => {
      if (menuRef.current?.contains(evento.target) || anclaRef.current?.contains(evento.target)) return;
      onCerrar();
    };
    const alPresionarTecla = (evento) => {
      if (evento.key !== 'Escape') return;
      onCerrar();
      anclaRef.current?.focus();
    };

    document.addEventListener('pointerdown', alHacerClic);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('pointerdown', alHacerClic);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto, onCerrar, anclaRef]);

  if (!abierto || !posicion || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      className={`${styles.menu} ${className}`.trim()}
      style={{ top: posicion.top, right: posicion.right }}
    >
      {children}
    </div>,
    document.body,
  );
}
