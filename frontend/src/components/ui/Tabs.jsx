import React, { createContext, useContext, useId } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, MotionConfig } from 'motion/react';
import styles from './Tabs.module.css';

const transicionPildora = { type: 'spring', stiffness: 170, damping: 24, mass: 1.2 };

const GrupoPestanasContext = createContext(null);

function Pildora() {
  const idGrupo = useContext(GrupoPestanasContext);
  return <motion.span layoutId={`${idGrupo}-pildora`} className={styles.pildora} aria-hidden="true" />;
}

// Contenedor compartido por las pestañas de ruta (TabLink) y de estado (TabButton);
// aisla su propia pastilla deslizante mediante un id único para no chocar con otros grupos en la misma página.
export function TabsList({ children, ariaLabel, as: Componente = 'div', role, className = '' }) {
  const idGrupo = useId();
  return (
    <MotionConfig transition={transicionPildora} reducedMotion="user">
      <GrupoPestanasContext.Provider value={idGrupo}>
        <Componente className={`${styles.lista} ${className}`} role={role} aria-label={ariaLabel}>
          {children}
        </Componente>
      </GrupoPestanasContext.Provider>
    </MotionConfig>
  );
}

// Pestaña que navega a una ruta (reemplaza los enlaces de ReportesNav/HistorialVentasNav).
export function TabLink({ to, end, children, className = '' }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `${styles.pestana} ${isActive ? styles.activa : ''} ${className}`}>
      {({ isActive }) => <>
        {isActive && <Pildora />}
        <span className={styles.etiqueta}>{children}</span>
      </>}
    </NavLink>
  );
}

// Pestaña controlada por estado/parámetros de URL (reemplaza los botones "quickFilter").
// Sin contador numérico: un ancho que cambia en cada clic hacía que la pastilla
// deslizante tuviera que redimensionarse además de moverse, y eso se sentía trabado.
export function TabButton({ active, onClick, children, className = '', ...props }) {
  return (
    <button type="button" className={`${styles.pestana} ${active ? styles.activa : ''} ${className}`} aria-pressed={active} onClick={onClick} {...props}>
      {active && <Pildora />}
      <span className={styles.etiqueta}>{children}</span>
    </button>
  );
}
