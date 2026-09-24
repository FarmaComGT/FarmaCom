import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ChevronDown,
  Tag,
  Truck,
  Warehouse,
  Building2,
  Store,
  MapPin,
  Users,
  UserCog,
  ShoppingCart,
  Banknote,
  BarChart3,
  HelpCircle,
  LogOut,
  X,
} from 'lucide-react';
import { logout } from '../api/auth';
import BrandLogo from '../components/BrandLogo.jsx';
import { useAuth, AUTH_ACTIONS } from '../context/AuthContext';

const inventarioSubItems = [
  { icon: Package, label: 'Productos', path: '/inventario/productos' },
  { icon: Warehouse, label: 'Inventario', path: '/inventario/stock' },
  { icon: Tag, label: 'Categorías', path: '/inventario/categorias' },
  { icon: Truck, label: 'Proveedores', path: '/inventario/proveedores' },
  { icon: Building2, label: 'Casas', path: '/inventario/casas' },
];

const sucursalSubItems = [
  { icon: Store, label: 'Sucursales', path: '/sucursales' },
  { icon: Building2, label: 'Ciudades', path: '/ciudades' },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Punto de venta', path: '/pos' },
  {
    icon: Banknote,
    label: 'Caja',
    path: '/caja',
    roles: ['dueno', 'administrador', 'dependiente'],
  },
  { icon: UserCog, label: 'Usuarios', path: '/usuarios', roles: ['dueno', 'administrador'] },
  { icon: Users, label: 'Clientes', path: '/patients' },
  {
    icon: BarChart3,
    label: 'Reportes',
    path: '/reports',
    roles: ['dueno', 'administrador'],
  },
];

const bottomNavItems = [
  { icon: HelpCircle, label: 'Ayuda', path: '/support' },
];

const topLevelItemClass = (isActive) =>
  `group flex items-center gap-3 rounded-xl px-4 py-3 outline-none select-none transition-colors duration-150 ${
    isActive
      ? 'border border-primary/5 bg-white font-bold text-primary shadow-sm'
      : 'font-medium text-slate-600 hover:bg-primary/5 hover:text-primary'
  } focus-visible:ring-2 focus-visible:ring-primary/20`;

const nestedItemClass = (isActive) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2.5 outline-none select-none transition-colors duration-150 ${
    isActive
      ? 'bg-primary/8 font-bold text-primary'
      : 'font-medium text-slate-500 hover:bg-primary/5 hover:text-primary'
  } focus-visible:ring-2 focus-visible:ring-primary/20`;

export default function Sidebar({ abierta, onCerrar, onNavegar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch, usuario } = useAuth();

  const inventarioActivo = location.pathname.startsWith('/inventario');
  const [inventarioAbierto, setInventarioAbierto] = useState(inventarioActivo);
  const sucursalesActivo = location.pathname.startsWith('/sucursales') || location.pathname.startsWith('/ciudades');
  const [sucursalesAbierto, setSucursalesAbierto] = useState(sucursalesActivo);
  const puedeVerSucursales = ['dueno', 'administrador'].includes(usuario?.rol);

  useEffect(() => {
    if (inventarioActivo) {
      setInventarioAbierto(true);
    }
  }, [inventarioActivo]);

  useEffect(() => {
    if (sucursalesActivo) {
      setSucursalesAbierto(true);
    }
  }, [sucursalesActivo]);

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/dashboard') {
      return false;
    }
    if (!item.roles) {
      return true;
    }
    return item.roles.includes(usuario?.rol);
  });

  const handleLogout = async () => {
    try {
      await logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      navigate('/login', { replace: true });
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        navigate('/login', { replace: true });
        return;
      }
      window.alert(error.response?.data?.mensaje || 'No se pudo cerrar sesión. Intenta de nuevo.');
    }
  };

  return (
    <aside
      id="sidebar-principal"
      aria-hidden={!abierta}
      onClick={(event) => {
        if (event.target.closest('a')) {
          onNavegar();
        }
      }}
      className={`fixed left-0 top-0 z-40 flex h-screen w-72 max-w-[85vw] flex-col border-r border-slate-100 bg-slate-50/95 p-4 shadow-2xl backdrop-blur-sm transition-transform duration-300 md:w-64 md:bg-slate-50/50 md:shadow-none ${
        abierta ? 'translate-x-0' : 'invisible -translate-x-full pointer-events-none'
      }`}
    >
      <div className="mb-8">
        <div className="flex h-9 justify-end">
          <button
            type="button"
            onClick={onCerrar}
            aria-controls="sidebar-principal"
            aria-expanded="true"
            aria-label="Cerrar menú lateral"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 outline-none transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex -translate-x-3 justify-center py-3">
          <BrandLogo subtitle="San Gabriel" centered />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => topLevelItemClass(isActive)}
        >
          <LayoutDashboard className="h-5 w-5 transition-transform duration-150 group-hover:scale-110" />
          <span className="text-sm font-headline">Dashboard</span>
        </NavLink>

        <div>
          <button
            type="button"
            onClick={() => setInventarioAbierto((prev) => !prev)}
            className={`w-full ${topLevelItemClass(inventarioActivo)}`}
          >
            <Package className="h-5 w-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span className="flex-1 text-left text-sm font-headline">Inventario</span>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 transition-transform duration-150 ${
                inventarioAbierto ? 'rotate-180' : ''
              } ${inventarioActivo ? 'text-primary' : 'text-slate-400'}`}
            />
          </button>

          {inventarioAbierto && (
            <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-primary/10 pl-3">
              {inventarioSubItems.map(({ icon: Icon, label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => nestedItemClass(isActive)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs font-headline">{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {puedeVerSucursales && (
          <div>
            <button
              type="button"
              onClick={() => setSucursalesAbierto((prev) => !prev)}
              className={`w-full ${topLevelItemClass(sucursalesActivo)}`}
            >
              <MapPin className="h-5 w-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
              <span className="flex-1 text-left text-sm font-headline">Ubicaciones</span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-150 ${
                  sucursalesAbierto ? 'rotate-180' : ''
                } ${sucursalesActivo ? 'text-primary' : 'text-slate-400'}`}
              />
            </button>

            {sucursalesAbierto && (
              <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-primary/10 pl-3">
                {sucursalSubItems.map(({ icon: Icon, label, path }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) => nestedItemClass(isActive)}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-headline">{label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => topLevelItemClass(isActive)}
          >
            <item.icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-110" />
            <span className="text-sm font-headline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-slate-200/50 pt-6">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-600 outline-none select-none transition-colors duration-150 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <item.icon className="h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
            <span className="text-sm font-headline">{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-600 outline-none select-none transition-colors duration-150 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <LogOut className="h-5 w-5 text-error transition-transform duration-150 group-hover:translate-x-1" />
          <span className="text-sm font-headline">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
