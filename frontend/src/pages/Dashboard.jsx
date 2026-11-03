import React, { useEffect, useMemo } from 'react';
import { ArrowRight, Boxes, Building2, CalendarDays, FlaskConical, HelpCircle, ReceiptText, ShoppingCart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/HomeSupport.module.css';

const ACCESOS = [
  { roles: ['dueno', 'administrador', 'dependiente'], to: '/pos', title: 'Punto de venta', text: 'Inicia una venta, selecciona lotes y registra el cobro.', icon: ShoppingCart },
  { roles: ['dueno', 'administrador', 'dependiente'], to: '/inventario', title: 'Inventario', text: 'Consulta existencias, vencimientos y lotes por sucursal.', icon: Boxes },
  { roles: ['dueno', 'administrador', 'dependiente'], to: '/patients', title: 'Clientes', text: 'Busca clientes y revisa su historial de compras.', icon: Users },
  { roles: ['dueno', 'administrador'], to: '/ventas/historial', title: 'Historial de ventas', text: 'Revisa ventas, responsables, detalles y anulaciones.', icon: ReceiptText },
  { roles: ['dueno', 'administrador'], to: '/sucursales', title: 'Sucursales', text: 'Administra ubicaciones y sus datos de contacto.', icon: Building2 },
  { roles: ['dueno', 'administrador', 'laboratorista'], to: '/laboratorio/pacientes', title: 'Laboratorio', text: 'Gestiona pacientes, expedientes y resultados.', icon: FlaskConical },
];
const etiquetasRol = { dueno: 'Dueño', administrador: 'Administrador', dependiente: 'Dependiente', laboratorista: 'Laboratorista' };

export default function Dashboard() {
  const { usuario } = useAuth();
  const accesos = useMemo(() => ACCESOS.filter(({ roles }) => roles.includes(usuario?.rol)), [usuario?.rol]);
  useEffect(() => { document.title = 'Inicio · FarmaCom'; }, []);
  const hoy = new Intl.DateTimeFormat('es-GT', { dateStyle: 'full', timeZone: 'America/Guatemala' }).format(new Date());
  return <section className={styles.page} aria-labelledby="inicio-title">
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Centro de trabajo</p><h1 id="inicio-title">Hola, {usuario?.nombre_usuario || 'equipo'}.</h1>
      <p className={styles.heroText}>Accede a las tareas disponibles para tu rol y continúa la operación de la farmacia desde un solo lugar.</p>
      <div className={styles.meta}><span className={styles.pill}><Users size={15} aria-hidden="true" />{etiquetasRol[usuario?.rol] || usuario?.rol}</span><span className={styles.pill}><CalendarDays size={15} aria-hidden="true" />{hoy}</span></div>
    </header>
    <section className={styles.section} aria-labelledby="accesos-title">
      <div className={styles.sectionHeading}><div><h2 id="accesos-title">Accesos rápidos</h2><p>Opciones habilitadas para tu cuenta.</p></div></div>
      <div className={styles.grid}>{accesos.map(({ to, title, text, icon: Icon }) => <Link key={to} to={to} className={styles.card}><span className={styles.icon}><Icon size={20} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p><span className={styles.cardAction}>Abrir <ArrowRight size={15} aria-hidden="true" /></span></Link>)}
        <Link to="/support" className={styles.card}><span className={styles.icon}><HelpCircle size={20} aria-hidden="true" /></span><h3>Ayuda</h3><p>Consulta guías breves de los procesos principales.</p><span className={styles.cardAction}>Consultar <ArrowRight size={15} aria-hidden="true" /></span></Link>
      </div>
    </section>
  </section>;
}
