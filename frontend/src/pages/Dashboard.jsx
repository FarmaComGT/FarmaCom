import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/Dashboard.module.css';

const farmacia = [
  { to: '/pos', title: 'Punto de venta', text: 'Preparar una venta y registrar el cobro.' },
  { to: '/caja', title: 'Caja', text: 'Abrir un turno, registrar movimientos o cerrar caja.' },
  { to: '/inventario', title: 'Existencias', text: 'Consultar productos, lotes y vencimientos.' },
];
const laboratorio = { to: '/laboratorio/pacientes', title: 'Pacientes', text: 'Consultar expedientes y cargar resultados de laboratorio.' };
const roles = { dependiente: 'Dependiente', laboratorista: 'Laboratorista' };

export default function Dashboard() {
  const { usuario } = useAuth();
  useEffect(() => { document.title = 'Inicio · FarmaCom'; }, []);
  if (['dueno', 'administrador'].includes(usuario?.rol)) return <Navigate to="/reports" replace />;
  const esLaboratorio = usuario?.rol === 'laboratorista';
  const esDependiente = usuario?.rol === 'dependiente';
  const tareas = esLaboratorio ? [laboratorio] : esDependiente ? farmacia : [];
  const consultas = esDependiente ? [
    { to: '/patients', title: 'Clientes', text: 'Datos fiscales, contactos e historial de compras.' },
  ] : [];
  const fila = ({ to, title, text }) => <Link key={to} to={to} className={styles.row}>
    <span><strong>{title}</strong><span>{text}</span></span><ArrowRight size={18} aria-hidden="true" />
  </Link>;
  return <section className={styles.page} aria-labelledby="inicio-title">
    <header className={styles.heading}>
      <h1 id="inicio-title">Inicio</h1>
      <p><span className={styles.name}>{usuario?.nombre_usuario || 'Equipo FarmaCom'}</span> · {roles[usuario?.rol] || 'Usuario'}</p>
    </header>
    <section aria-labelledby="trabajo-title" className={styles.tasks}>
      <h2 id="trabajo-title">{esLaboratorio ? 'Trabajo de laboratorio' : 'Trabajo de farmacia'}</h2>
      {tareas.map(fila)}
      {!tareas.length && <p>No hay tareas disponibles para esta cuenta. Consulta con tu administrador.</p>}
    </section>
    {consultas.length > 0 && <section aria-labelledby="consultas-title" className={styles.secondary}>
      <h2 id="consultas-title">Consultas frecuentes</h2>{consultas.map(fila)}
    </section>}
    <footer className={styles.footer}><Link to="/support">Consultar ayuda</Link><span>Guías de los procesos de FarmaCom.</span></footer>
  </section>;
}
