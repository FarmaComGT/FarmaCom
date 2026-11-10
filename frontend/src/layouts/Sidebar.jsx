import { useToast } from '../context/ToastContext.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import NavigationIcon from '../components/navigation/NavigationIcon.jsx';
import { logout } from '../api/auth';
import { useAuth, AUTH_ACTIONS } from '../context/AuthContext';
import { navegarConTransicionDeVista } from '../utils/viewTransition';

import { NAVEGACION, DASHBOARD, AYUDA, contextoNavegacion } from '../components/navigation/navigation.js';

const ROLES_DASHBOARD_REPORTES = ['dueno', 'administrador'];

function NavigationLink({ icon, label, path, excluir = [], nested = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const esDetalleDeExistencias = path === '/inventario' && /^\/inventario\/productos\/[^/]+\/lotes$/.test(pathname);

  return <NavLink
    to={path}
    end={((path === '/inventario' && !esDetalleDeExistencias) || path === '/caja') || excluir.some(ruta => pathname === ruta || pathname.startsWith(`${ruta}/`))}
    aria-current={esDetalleDeExistencias ? 'location' : 'page'}
    className={`shell-nav-link ${nested ? 'shell-nav-nested' : ''}`}
    onClick={(event) => navegarConTransicionDeVista({
      event,
      navigate,
      destino: path,
      rutaActual: pathname,
    })}
  >
    {icon && <NavigationIcon name={icon} />}
    <span>{label}</span>
  </NavLink>;
}

function NavigationGroup({ label, icon, open, onToggle, children, id, active }) {
  return <div className="shell-nav-group">
    <button className={`shell-nav-group-button ${active ? 'is-current-group' : ''}`} type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
      <NavigationIcon name={icon} /><span>{label}</span><NavigationIcon name="chevron" size={12} className={open ? 'is-expanded' : ''} />
    </button>
    {open && <div className="shell-nav-children" id={id}>{children}</div>}
  </div>;
}

export default function Sidebar({ abierta, superpuesta = false, onCerrar, onNavegar }) {
  const toast = useToast();
  const avisoSesion = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { dispatch, usuario } = useAuth();
  const grupoActual = contextoNavegacion(pathname).grupo;
  const [gruposAbiertos, setGruposAbiertos] = useState(() => ({ [grupoActual]: true }));
  const [cerrando, setCerrando] = useState(false);
  useEffect(() => {
    if (grupoActual && abierta) setGruposAbiertos(actuales => ({ ...actuales, [grupoActual]: true }));
  }, [grupoActual, pathname, abierta]);
  const visible = (item) => !item.roles || item.roles.includes(usuario?.rol);
  const secciones = NAVEGACION.map(seccion => ({ ...seccion, items: seccion.items.filter(visible) }))
    .filter(seccion => seccion.items.length > 0);
  // Solo dueño y administrador tienen una primera pestaña; los demás roles aterrizan
  // directo en su módulo de trabajo (Caja o Laboratorio).
  const primeraPestana = ROLES_DASHBOARD_REPORTES.includes(usuario?.rol) ? DASHBOARD : null;
  const handleLogout = async () => {
    toast.cerrar(avisoSesion.current);
    setCerrando(true);
    try {
      await logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      navigate('/login', { replace: true });
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        navigate('/login', { replace: true });
      } else if (error.response?.status === 409) {
        // Hay un turno de caja abierto por este usuario: no se puede salir sin cerrarlo.
        avisoSesion.current = toast.warning(error.response.data?.mensaje
          || 'No puedes cerrar sesión con un turno de caja abierto. Dirígete a Caja › Operación para cerrar el turno actual.');
        if (pathname !== '/caja') navigate('/caja');
      } else {
        avisoSesion.current = toast.error(error.response?.data?.mensaje || 'No se pudo cerrar sesión. Intenta de nuevo.');
      }
    } finally { setCerrando(false); }
  };

  return <aside id="sidebar-principal" className={`shell-sidebar ${abierta ? 'is-open' : ''}`} aria-label="Navegación principal" aria-hidden={!abierta}
    role={superpuesta && abierta ? 'dialog' : undefined} aria-modal={superpuesta && abierta ? true : undefined}
    onClick={(event) => {
      if (event.target.closest('a') && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavegar();
    }}>
    <div className="shell-sidebar-heading">
      <div className="shell-wordmark" translate="no"><div><strong>FarmaCom</strong><span>Farmacia San Gabriel</span></div></div>
      <button type="button" className="shell-icon-button shell-close-sidebar" onClick={onCerrar} aria-label="Cerrar menú lateral" aria-controls="sidebar-principal" aria-expanded="true"><NavigationIcon name="collapse" /></button>
    </div>
    <nav className="shell-navigation" aria-label="Módulos de FarmaCom">
      {primeraPestana && <NavigationLink {...primeraPestana} />}
      {secciones.map(seccion => <div className="shell-nav-section" key={seccion.label}>
        <p className="shell-nav-section-label">{seccion.label}</p>
        {seccion.items.map(item => item.children
          ? <NavigationGroup key={item.id} label={item.label} icon={item.icon}
              open={Boolean(gruposAbiertos[item.id])}
              onToggle={() => setGruposAbiertos(actuales => ({ ...actuales, [item.id]: !actuales[item.id] }))}
              id={`navegacion-${item.id}`} active={grupoActual === item.id}>
              {item.children.filter(visible).map(hijo => <NavigationLink key={hijo.path} {...hijo} nested />)}
            </NavigationGroup>
          : <NavigationLink key={item.path} {...item} />)}
      </div>)}
    </nav>
    <div className="shell-sidebar-footer">
      <NavigationLink {...AYUDA} />
      <button type="button" className="shell-nav-link shell-logout" onClick={handleLogout} disabled={cerrando}>
        <NavigationIcon name={cerrando ? 'loading' : 'exit'} className={cerrando ? 'shell-loading' : ''} /><span>Cerrar sesión{cerrando ? '…' : ''}</span>
      </button>
    </div>
  </aside>;
}
