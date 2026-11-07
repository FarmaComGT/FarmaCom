import React, { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/Support.module.css';

const farmacia = ['dueno', 'administrador', 'dependiente'];
const gestion = ['dueno', 'administrador'];
const laboratorio = ['dueno', 'administrador', 'laboratorista'];
const todos = [...farmacia, 'laboratorista'];
const TEMAS = [
  { id: 'abrir-caja', grupo: 'tareas', roles: farmacia, title: 'Abrir un turno de caja', pasos: ['En Caja, selecciona la caja de tu sucursal.', 'Elige el turno e ingresa el fondo inicial: el efectivo disponible antes de vender.', 'Pulsa “Abrir turno”. Usa esa misma caja en Punto de venta.'], destino: '/caja', enlace: 'Ir a Caja' },
  { id: 'venta', grupo: 'tareas', roles: farmacia, title: 'Registrar una venta', pasos: ['En Punto de venta, selecciona una caja con un turno abierto.', 'Busca el producto, selecciona un lote disponible y revisa las cantidades del carrito.', 'Confirma el cliente, el método de pago y el total antes de completar el cobro.'], destino: '/pos', enlace: 'Ir a Punto de venta' },
  { id: 'inventario', grupo: 'tareas', roles: farmacia, title: 'Consultar inventario por sucursal', pasos: ['En Inventario, comprueba la sucursal seleccionada.', 'Busca por código, nombre comercial o genérico. Puedes combinar los filtros de stock y vencimiento.', 'Abre los lotes del producto para revisar sus existencias y fechas de vencimiento.'], nota: 'La dirección de la página conserva los filtros; puedes guardarla para volver a esa consulta.', destino: '/inventario', enlace: 'Ir a Inventario' },
  { id: 'lotes', grupo: 'tareas', roles: gestion, title: 'Ingresar o corregir un lote', pasos: ['Busca el producto en Inventario y abre sus lotes.', 'Para una entrada nueva, usa “Ingresar lote” y completa sus datos.', 'Para corregir existencias, usa “Ajustar stock” e indica la diferencia y el motivo.'], nota: 'La edición general del lote no sobrescribe las existencias.', destino: '/inventario', enlace: 'Buscar el producto' },
  { id: 'cerrar-caja', grupo: 'tareas', roles: farmacia, title: 'Cerrar un turno de caja', pasos: ['En Caja, selecciona la caja del turno que vas a cerrar.', 'Cuenta el efectivo físico e ingresa el efectivo contado y la nota de cierre.', 'Revisa la diferencia con el efectivo esperado antes de confirmar “Cerrar turno”.'], nota: 'Si hay una diferencia, revisa los movimientos y deja constancia en la nota de cierre.', destino: '/caja', enlace: 'Revisar Caja' },
  { id: 'usuarios', grupo: 'tareas', roles: gestion, title: 'Administrar usuarios con seguridad', pasos: ['Busca la cuenta en Usuarios y revisa su sucursal y rol.', 'Solo el dueño puede crear cuentas, asignar roles elevados o activar y desactivar usuarios.', 'Un administrador puede editar las cuentas permitidas de su sucursal; no puede convertirse en dueño.'], destino: '/usuarios', enlace: 'Ir a Usuarios' },
  { id: 'laboratorio', grupo: 'tareas', roles: laboratorio, title: 'Gestionar un expediente de laboratorio', pasos: ['En Laboratorio, busca al paciente y abre su expediente.', 'Verifica la identidad del paciente y el laboratorio asignado.', 'Registra la visita o los resultados en el expediente correspondiente.'], destino: '/laboratorio/pacientes', enlace: 'Buscar un paciente' },
  { id: 'producto-no-aparece', grupo: 'problemas', roles: farmacia, title: 'No encuentro un producto para vender', pasos: ['Comprueba la sucursal y busca por nombre o código.', 'Consulta sus existencias y lotes en Inventario. Revisa si hay stock disponible y si los lotes están vencidos.', 'Si los datos no coinciden con las existencias físicas, pide al administrador que revise el producto y sus lotes.'], destino: '/inventario', enlace: 'Consultar existencias' },
  { id: 'sin-turno', grupo: 'problemas', roles: farmacia, title: 'No puedo cobrar una venta', pasos: ['Comprueba que seleccionaste la caja correcta y que tiene un turno abierto.', 'Revisa los avisos de Punto de venta y las cantidades disponibles en cada lote.', 'Si el problema continúa, indica al administrador el mensaje exacto, la caja y la sucursal.'], destino: '/caja', enlace: 'Comprobar el turno' },
  { id: 'anular-venta', grupo: 'problemas', roles: gestion, title: 'Anular una venta', pasos: ['En Historial de ventas, abre el detalle de la venta.', 'Revisa su método de pago y el estado de la sesión de caja. Para anular una venta admitida, indica el motivo y confirma la anulación completa.'], nota: 'Las ventas con tarjeta se gestionan como reembolso en Recurrente. FarmaCom no modifica su caja ni sus existencias. No se permiten devoluciones parciales.', destino: '/ventas/historial', enlace: 'Ir al Historial de ventas' },
  { id: 'corregir-venta', grupo: 'problemas', roles: ['dependiente'], title: 'Necesito corregir una venta cobrada', pasos: ['Anota la referencia de la venta, la caja y el motivo de la corrección.', 'Solicita al administrador que revise la venta. El historial de ventas está disponible para el dueño y el administrador.'], nota: 'No registres otra venta para compensarla sin que se haya revisado el caso.' },
  { id: 'acceso', grupo: 'problemas', roles: todos, title: 'No puedo iniciar sesión', pasos: ['Verifica el correo y permite que el gestor de contraseñas complete la clave.', 'Si la cuenta está inactiva o no puedes recuperar el acceso, solicita ayuda al dueño.', 'Después de cambiar la contraseña, inicia sesión nuevamente.'] },
];
const normalizar = (valor) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const GRUPOS = [{ id: 'tareas', titulo: 'Cómo hacer…' }, { id: 'problemas', titulo: 'Resolver un problema' }];

export default function Support() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const consulta = params.get('q') || '';
  const abierto = params.get('tema');
  const temas = useMemo(() => {
    const palabras = normalizar(consulta.trim()).split(/\s+/).filter(Boolean);
    return TEMAS.filter(tema => tema.roles.includes(usuario?.rol) && palabras.every(palabra => normalizar([tema.title, ...tema.pasos, tema.nota || ''].join(' ')).includes(palabra)));
  }, [consulta, usuario?.rol]);
  useEffect(() => { document.title = 'Ayuda · FarmaCom'; }, []);
  const actualizar = (clave, valor, replace = false) => setParams(actuales => {
    const siguientes = new URLSearchParams(actuales);
    if (valor) siguientes.set(clave, valor); else siguientes.delete(clave);
    return siguientes;
  }, { replace, preventScrollReset: true });

  return <section className={styles.page} aria-labelledby="ayuda-title">
    <header className={styles.heading}>
      <h1 id="ayuda-title">Ayuda</h1>
      <p>Pasos para trabajar en FarmaCom y resolver dudas de tu cuenta.</p>
    </header>
    <div className={styles.searchArea}>
      <label htmlFor="buscar-ayuda">Buscar en la ayuda</label>
      <div className={styles.searchRow}>
        <input id="buscar-ayuda" name="q" type="search" value={consulta} onChange={evento => actualizar('q', evento.target.value, true)} placeholder="Por ejemplo: cerrar caja…" autoComplete="off" spellCheck={false} />
        {consulta && <button type="button" onClick={() => { actualizar('q', '', true); document.getElementById('buscar-ayuda')?.focus(); }}>Limpiar búsqueda</button>}
      </div>
      <p role="status">{temas.length} {temas.length === 1 ? 'resultado' : 'resultados'}</p>
    </div>
    {temas.length ? <div className={styles.groups}>{GRUPOS.map(grupo => {
      const filas = temas.filter(tema => tema.grupo === grupo.id);
      return filas.length > 0 && <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`}>
        <h2 id={`grupo-${grupo.id}`}>{grupo.titulo}</h2>
        {filas.map(tema => <details key={tema.id} className={styles.topic} open={abierto === tema.id}>
          <summary
            onClick={evento => { evento.preventDefault(); actualizar('tema', abierto === tema.id ? '' : tema.id); }}
            onKeyDown={evento => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                if (!evento.repeat) actualizar('tema', abierto === tema.id ? '' : tema.id);
              }
            }}
          >{tema.title}</summary>
          <div className={styles.body}>
            <ol>{tema.pasos.map(paso => <li key={paso}>{paso}</li>)}</ol>
            {tema.nota && <p>{tema.nota}</p>}
            {tema.destino && <Link to={tema.destino}>{tema.enlace}</Link>}
          </div>
        </details>)}
      </section>;
    })}</div> : <div className={styles.empty}><h2>No encontramos ese tema.</h2><p>Prueba con “caja”, “venta” o “contraseña”, o limpia la búsqueda para ver las guías disponibles.</p></div>}
    <footer className={styles.footer}><h2>Si necesitas más ayuda</h2><p>Consulta con {usuario?.rol === 'dueno' ? 'la persona responsable del soporte de FarmaCom' : 'el administrador o el dueño'}. Indica qué intentabas hacer, el mensaje que apareció y la sucursal. Evita compartir contraseñas o datos de pacientes.</p></footer>
  </section>;
}
