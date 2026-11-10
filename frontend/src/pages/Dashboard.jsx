import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDefaultRouteForRole } from '../utils/navigation';
import styles from '../styles/Dashboard.module.css';

const laboratorio = { to: '/laboratorio/pacientes', title: 'Pacientes', text: 'Consultar expedientes y cargar resultados de laboratorio.' };

// Único rol que conserva "Inicio": dueño/administrador ya aterrizan en Reportes y
// dependiente en Caja, así que esta pantalla no tiene nada que ofrecerles.
export default function Dashboard() {
  const { usuario } = useAuth();
  useEffect(() => { document.title = 'Inicio · FarmaCom'; }, []);
  if (usuario?.rol !== 'laboratorista') return <Navigate to={getDefaultRouteForRole(usuario?.rol)} replace />;
  const fila = ({ to, title, text }) => <Link key={to} to={to} className={styles.row}>
    <span><strong>{title}</strong><span>{text}</span></span><ArrowRight size={18} aria-hidden="true" />
  </Link>;
  return <section className={styles.page} aria-labelledby="inicio-title">
    <header className={styles.heading}>
      <h1 id="inicio-title">Inicio</h1>
      <p><span className={styles.name}>{usuario?.nombre_usuario || 'Equipo FarmaCom'}</span> · Laboratorista</p>
    </header>
    <section aria-labelledby="trabajo-title" className={styles.tasks}>
      <h2 id="trabajo-title">Trabajo de laboratorio</h2>
      {fila(laboratorio)}
    </section>
    <footer className={styles.footer}><Link to="/support">Consultar ayuda</Link><span>Guías de los procesos de FarmaCom.</span></footer>
  </section>;
}
