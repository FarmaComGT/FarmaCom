import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import NavigationIcon from '../components/navigation/NavigationIcon.jsx';
import { logout } from '../api/auth';
import { useAuth, AUTH_ACTIONS } from '../context/AuthContext';

const farmacia = ['dueno', 'administrador', 'dependiente'];
const gestion = ['dueno', 'administrador'];
const inventario = [
  { label: 'Existencias', path: '/inventario' },
  { label: 'Categorías', path: '/inventario/categorias' },
  { label: 'Proveedores', path: '/inventario/proveedores' },
  { label: 'Casas farmacéuticas', path: '/inventario/casas' },
  { label: 'Promociones', path: '/inventario/promociones', roles: gestion },
];
const ubicaciones = [
  { label: 'Sucursales', path: '/sucursales' },
  { label: 'Laboratorios', path: '/laboratorios' },
  { label: 'Ciudades', path: '/ciudades' },
];
const operaciones = [
  { icon: 'dispensing', label: 'Punto de venta', path: '/pos', roles: farmacia },
  { icon: 'cash', label: 'Caja', path: '/caja', roles: farmacia },
  { icon: 'customer', label: 'Clientes', path: '/patients', roles: farmacia },
  { icon: 'laboratory', label: 'Laboratorio', path: '/laboratorio/pacientes', roles: ['dueno', 'administrador', 'laboratorista'] },
];
const administracion = [
  { icon: 'reports', label: 'Reportes', path: '/reports', roles: gestion },
  { icon: 'history', label: 'Historial de ventas', path: '/ventas/historial', roles: gestion },
  { icon: 'team', label: 'Usuarios', path: '/usuarios', roles: gestion },
];

function NavigationLink({ icon, label, path, nested = false }) {
  return <NavLink to={path} end={path === '/inventario'} className={`shell-nav-link ${nested ? 'shell-nav-nested' : ''}`}>
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

export default function Sidebar({ abierta, onCerrar, onNavegar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { dispatch, usuario } = useAuth();
  const inventarioActivo = pathname.startsWith('/inventario');
  const ubicacionesActivas = ['/sucursales', '/laboratorios', '/ciudades'].some(ruta => pathname.startsWith(ruta));
  const [inventarioAbierto, setInventarioAbierto] = useState(inventarioActivo);
  const [ubicacionesAbiertas, setUbicacionesAbiertas] = useState(ubicacionesActivas);
  const [cerrando, setCerrando] = useState(false);
  const [errorSesion, setErrorSesion] = useState('');
  useEffect(() => { if (inventarioActivo) setInventarioAbierto(true); }, [inventarioActivo]);
  useEffect(() => { if (ubicacionesActivas) setUbicacionesAbiertas(true); }, [ubicacionesActivas]);
  const visible = (item) => !item.roles || item.roles.includes(usuario?.rol);
  const handleLogout = async () => {
    setCerrando(true);
    setErrorSesion('');
    try {
      await logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      navigate('/login', { replace: true });
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        navigate('/login', { replace: true });
      } else {
        setErrorSesion(error.response?.data?.mensaje || 'No se pudo cerrar sesión. Intenta de nuevo.');
      }
    } finally { setCerrando(false); }
  };

  return <aside id="sidebar-principal" className={`shell-sidebar ${abierta ? 'is-open' : ''}`} aria-label="Navegación principal" aria-hidden={!abierta}
    onClick={(event) => { if (event.target.closest('a')) onNavegar(); }}>
    <div className="shell-sidebar-heading">
      <div className="shell-wordmark" translate="no"><div><strong>FarmaCom</strong><span>Farmacia San Gabriel</span></div></div>
      <button type="button" className="shell-icon-button shell-close-sidebar" onClick={onCerrar} aria-label="Cerrar menú lateral" aria-controls="sidebar-principal" aria-expanded="true"><NavigationIcon name="collapse" /></button>
    </div>
    <nav className="shell-navigation" aria-label="Módulos de FarmaCom">
      {usuario?.rol !== 'laboratorista' && <NavigationLink icon="overview" label="Dashboard" path="/dashboard" />}
      <div className="shell-nav-section">
        <p className="shell-nav-section-label">Operación</p>
        {farmacia.includes(usuario?.rol) && <NavigationGroup label="Inventario" icon="inventory" open={inventarioAbierto} onToggle={() => setInventarioAbierto(v => !v)} id="navegacion-inventario" active={inventarioActivo}>
          {inventario.filter(visible).map(item => <NavigationLink key={item.path} {...item} nested />)}
        </NavigationGroup>}
        {operaciones.filter(visible).map(item => <NavigationLink key={item.path} {...item} />)}
      </div>
      {gestion.includes(usuario?.rol) && <div className="shell-nav-section">
        <p className="shell-nav-section-label">Administración</p>
        {administracion.filter(visible).map(item => <NavigationLink key={item.path} {...item} />)}
        <NavigationGroup label="Ubicaciones" icon="locations" open={ubicacionesAbiertas} onToggle={() => setUbicacionesAbiertas(v => !v)} id="navegacion-ubicaciones" active={ubicacionesActivas}>
          {ubicaciones.map(item => <NavigationLink key={item.path} {...item} nested />)}
        </NavigationGroup>
      </div>}
    </nav>
    <div className="shell-sidebar-footer">
      <NavigationLink icon="help" label="Ayuda" path="/support" />
      <button type="button" className="shell-nav-link shell-logout" onClick={handleLogout} disabled={cerrando}>
        <NavigationIcon name={cerrando ? 'loading' : 'exit'} className={cerrando ? 'shell-loading' : ''} /><span>Cerrar sesión{cerrando ? '…' : ''}</span>
      </button>
      {errorSesion && <p role="status" className="shell-session-error">{errorSesion}</p>}
    </div>
  </aside>;
}
