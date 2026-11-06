import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavigationIcon from '../components/navigation/NavigationIcon.jsx';
import { useAuth } from '../context/AuthContext';
import { contextoNavegacion } from '../components/navigation/navigation.js';
import { destinoExistencias } from '../utils/navegacionInventario.js';
import SucursalTrabajo from '../components/navigation/SucursalTrabajo.jsx';

const roles = { dueno: 'Propietario', administrador: 'Administrador', dependiente: 'Dependiente', laboratorista: 'Laboratorista' };

export default function TopNav({ sidebarAbierta, superpuesta = false, onAbrirSidebar }) {
  const { usuario, sucursalActivaId } = useAuth();
  const { pathname, search, state } = useLocation();
  const { area, pagina, destino } = contextoNavegacion(pathname);
  const esDetalleLotes = /^\/inventario\/productos\/[^/]+\/lotes$/.test(pathname);
  const regreso = esDetalleLotes ? destinoExistencias(new URLSearchParams(search)) : destino;
  const nombre = usuario?.nombre_usuario || 'Usuario FarmaCom';
  const iniciales = nombre.split(' ').filter(Boolean).slice(0,2).map(parte => parte[0]).join('').toLocaleUpperCase('es-GT');
  const fecha = new Date();
  const fechaCorta = new Intl.DateTimeFormat('es-GT', {day: 'numeric', month: 'long', timeZone: 'America/Guatemala'}).format(fecha);
  const fechaCompleta = new Intl.DateTimeFormat('es-GT', {dateStyle: 'full', timeZone: 'America/Guatemala'}).format(fecha);
  const fechaISO = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Guatemala'}).format(fecha);

  return <header className="shell-topbar">
    <div className="shell-topbar-location">
      {!sidebarAbierta && <button type="button" className="shell-icon-button" onClick={onAbrirSidebar} aria-controls="sidebar-principal" aria-expanded="false" aria-label="Mostrar menú lateral"><NavigationIcon name={superpuesta ? 'menu' : 'expand'} /></button>}
      <div className="shell-topbar-context">
      <nav className="shell-breadcrumbs" aria-label="Ubicación actual">
        <ol><li>{regreso ? <Link to={regreso} state={esDetalleLotes ? { entradaInventario: state?.entradaInventario } : undefined}>{area}</Link> : <span>{area}</span>}</li>
          {pagina && <li aria-current="page"><span className="shell-breadcrumb-separator" aria-hidden="true">/</span><span title={pagina}>{pagina}</span></li>}
        </ol>
      </nav>
      {usuario?.rol === 'laboratorista'
        ? <p className="shell-workspace">Trabajo: {usuario.id_laboratorio ? `Laboratorio ${usuario.id_laboratorio}` : 'Laboratorio'}</p>
        : <SucursalTrabajo idSucursal={usuario?.rol === 'dependiente' ? usuario.id_sucursal : sucursalActivaId} />}
      </div>
    </div>
    <div className="shell-topbar-session">
      <time dateTime={fechaISO} title={fechaCompleta}>{fechaCorta}</time>
      <div className="shell-session" aria-label={`Sesión de ${nombre}, ${roles[usuario?.rol] || usuario?.rol || 'Operador'}`}>
        <span className="shell-session-initials" aria-hidden="true">{iniciales}</span>
        <div><p className="shell-session-name">{nombre}</p><p className="shell-session-role">{roles[usuario?.rol] || usuario?.rol || 'Operador'}</p></div>
      </div>
    </div>
  </header>;
}
