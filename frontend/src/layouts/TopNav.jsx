import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavigationIcon from '../components/navigation/NavigationIcon.jsx';
import { useAuth } from '../context/AuthContext';

const CONTEXTOS = [
  ['/inventario/productos/', 'Inventario', 'Lotes del producto', '/inventario'],
  ['/inventario/categorias', 'Inventario', 'Categorías', '/inventario'],
  ['/inventario/proveedores', 'Inventario', 'Proveedores', '/inventario'],
  ['/inventario/casas', 'Inventario', 'Casas farmacéuticas', '/inventario'],
  ['/inventario/promociones', 'Inventario', 'Promociones', '/inventario'],
  ['/inventario', 'Inventario', 'Existencias', null],
  ['/ventas/historial/productos', 'Ventas', 'Productos vendidos', '/ventas/historial'],
  ['/ventas/historial', 'Ventas', 'Historial', null],
  ['/caja/historial', 'Caja', 'Historial', '/caja'],
  ['/caja/administracion', 'Caja', 'Administración', '/caja'],
  ['/caja', 'Caja', 'Operación', null],
  ['/pos', 'Ventas', 'Punto de venta', null],
  ['/laboratorio/pacientes/', 'Laboratorio', 'Expediente', '/laboratorio/pacientes'],
  ['/laboratorio', 'Laboratorio', 'Pacientes', null],
  ['/reports/rentabilidad', 'Reportes', 'Rentabilidad', '/reports'],
  ['/reports', 'Reportes', 'Ventas', null],
  ['/patients', 'Clientes', null, null],
  ['/sucursales', 'Ubicaciones', 'Sucursales', null],
  ['/laboratorios', 'Ubicaciones', 'Laboratorios', null],
  ['/ciudades', 'Ubicaciones', 'Ciudades', null],
  ['/usuarios', 'Administración', 'Usuarios', null],
  ['/support', 'Ayuda', null, null],
  ['/dashboard', 'Dashboard', null, null],
];
const roles = { dueno: 'Propietario', administrador: 'Administrador', dependiente: 'Dependiente', laboratorista: 'Laboratorista' };

export default function TopNav({ sidebarAbierta, onAbrirSidebar }) {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const [, area, pagina, destino] = CONTEXTOS.find(([ruta]) => pathname.startsWith(ruta)) || ['', 'FarmaCom', null, null];
  const nombre = usuario?.nombre_usuario || 'Usuario FarmaCom';
  const iniciales = nombre.split(' ').filter(Boolean).slice(0,2).map(parte => parte[0]).join('').toLocaleUpperCase('es-GT');
  const fecha = new Date();
  const fechaCorta = new Intl.DateTimeFormat('es-GT', {day: 'numeric', month: 'long', timeZone: 'America/Guatemala'}).format(fecha);
  const fechaCompleta = new Intl.DateTimeFormat('es-GT', {dateStyle: 'full', timeZone: 'America/Guatemala'}).format(fecha);
  const fechaISO = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Guatemala'}).format(fecha);

  return <header className="shell-topbar">
    <div className="shell-topbar-location">
      {!sidebarAbierta && <button type="button" className="shell-icon-button" onClick={onAbrirSidebar} aria-controls="sidebar-principal" aria-expanded="false" aria-label="Mostrar menú lateral"><NavigationIcon name="expand" /></button>}
      <nav className="shell-breadcrumbs" aria-label="Ubicación actual">
        <ol><li>{destino ? <Link to={destino}>{area}</Link> : <span>{area}</span>}</li>
          {pagina && <li aria-current="page"><span className="shell-breadcrumb-separator" aria-hidden="true">/</span><span>{pagina}</span></li>}
        </ol>
      </nav>
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
