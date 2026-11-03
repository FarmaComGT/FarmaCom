import React, { useEffect, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/HomeSupport.module.css';

const TEMAS = [
  { roles: ['dueno', 'administrador', 'dependiente'], title: 'Registrar una venta', body: <ol><li>Abre “Punto de venta” y selecciona la caja.</li><li>Busca el producto y elige un lote disponible.</li><li>Confirma cantidades, cliente y método de pago.</li><li>Revisa el total antes de completar el cobro.</li></ol>, search: 'venta cobro caja producto lote' },
  { roles: ['dueno', 'administrador', 'dependiente'], title: 'Consultar inventario por sucursal', body: <p>Abre “Inventario” y selecciona la sucursal. Los filtros de stock y vencimiento se guardan en la dirección de la página para recuperar la vista.</p>, search: 'inventario sucursal stock existencias vencimiento filtros' },
  { roles: ['dueno', 'administrador'], title: 'Ingresar o corregir un lote', body: <p>Usa “Ingresar lote” para una entrada nueva. Para corregir existencias, abre los lotes del producto y elige “Ajustar stock”; indica la diferencia y un motivo. La edición general no sobrescribe existencias.</p>, search: 'lote ingresar corregir ajustar stock motivo' },
  { roles: ['dueno', 'administrador'], title: 'Administrar usuarios con seguridad', body: <p>Solo el dueño puede crear cuentas, asignar roles elevados o activar y desactivar usuarios. Un administrador puede editar cuentas permitidas de su propia sucursal, pero nunca convertirse en dueño.</p>, search: 'usuarios roles dueño administrador permisos cuenta' },
  { roles: ['dueno', 'administrador', 'dependiente'], title: 'Anular una venta', body: <p>En el historial, abre la venta y selecciona “Anular…”. Debes indicar un motivo. El sistema restaura las existencias y registra el movimiento con su responsable y referencia.</p>, search: 'anular venta devolución restaurar existencias motivo' },
  { roles: ['dueno', 'administrador', 'laboratorista'], title: 'Gestionar un expediente de laboratorio', body: <p>Busca al paciente desde “Laboratorio”, abre su expediente y registra visitas o resultados. Verifica siempre que trabajas en el laboratorio asignado.</p>, search: 'laboratorio paciente expediente resultado visita' },
  { roles: ['dueno', 'administrador', 'dependiente', 'laboratorista'], title: 'No puedo iniciar sesión', body: <ul><li>Verifica el correo y permite que el gestor de contraseñas complete la clave.</li><li>Si la cuenta está inactiva, solicita ayuda al dueño.</li><li>Después de cambiar la contraseña, inicia sesión nuevamente.</li></ul>, search: 'sesión contraseña correo cuenta inactiva acceso' },
];
const normalizar = (valor) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Support() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const consulta = params.get('q') || '';
  const temas = useMemo(() => {
    const termino = normalizar(consulta.trim());
    return TEMAS.filter(({ roles, title, search }) => roles.includes(usuario?.rol) && (!termino || normalizar(`${title} ${search}`).includes(termino)));
  }, [consulta, usuario?.rol]);
  useEffect(() => { document.title = 'Ayuda · FarmaCom'; }, []);
  return <section className={styles.page} aria-labelledby="ayuda-title">
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Guía de uso</p><h1 id="ayuda-title">¿En qué podemos ayudarte?</h1>
      <p className={styles.heroText}>Encuentra instrucciones breves para completar los procesos disponibles en tu cuenta.</p>
      <label className={styles.search}><Search size={19} aria-hidden="true" /><span className="sr-only">Buscar en la ayuda</span><input name="q" type="search" value={consulta} onChange={(evento) => setParams(evento.target.value ? { q: evento.target.value } : {}, { replace: true })} placeholder="Buscar: inventario, ventas, usuarios…" autoComplete="off" /></label>
    </header>
    <section className={styles.section} aria-labelledby="temas-title">
      <div className={styles.sectionHeading}><div><h2 id="temas-title">Temas de ayuda</h2><p aria-live="polite">{temas.length} {temas.length === 1 ? 'resultado' : 'resultados'}</p></div><BookOpen size={22} aria-hidden="true" /></div>
      {temas.length > 0 ? <div className={styles.topics}>{temas.map((tema) => <details key={tema.title} className={styles.topic}><summary>{tema.title}</summary><div className={styles.topicBody}>{tema.body}</div></details>)}</div> : <div className={styles.empty}><strong>No encontramos ese tema.</strong><p>Prueba con “inventario”, “venta” o “contraseña”.</p></div>}
    </section>
  </section>;
}
