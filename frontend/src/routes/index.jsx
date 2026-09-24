import React, { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import PublicRoute from '../components/auth/PublicRoute.jsx';
import RoleRoute from '../components/auth/RoleRoute.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import ReportesLayout from '../layouts/ReportesLayout.jsx';
import Login from '../pages/Login.jsx';
import Ciudades from '../pages/Ciudades.jsx';
import Sucursales from '../pages/Sucursales.jsx';
import Usuarios from '../pages/Usuarios.jsx';
import Productos from '../pages/inventario/Productos.jsx';
import InventarioSucursal from '../pages/inventario/InventarioSucursal.jsx';
import Categorias from '../pages/inventario/Categorias.jsx';
import Proveedores from '../pages/inventario/Proveedores.jsx';
import Casas from '../pages/inventario/Casas.jsx';
import Clientes from '../pages/Clientes.jsx';
import PuntoVenta from '../pages/ventas/PuntoVenta.jsx';
import CajaOperativa from '../pages/caja/CajaOperativa.jsx';

const Reportes = lazy(() => import('../pages/reportes/Reportes.jsx'));
const Rentabilidad = lazy(() => import('../pages/reportes/Rentabilidad.jsx'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route
            path="/dashboard"
            element={<div className="p-8 font-headline text-2xl font-bold">Dashboard (Próximamente)</div>}
          />

          <Route path="/inventario">
            <Route index element={<Navigate to="productos" replace />} />
            <Route path="productos" element={<Productos />} />
            <Route path="stock" element={<InventarioSucursal />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="casas" element={<Casas />} />
          </Route>

          {/* Admin */}
          <Route element={<RoleRoute allowedRoles={['dueno', 'administrador']} />}>
            <Route path="/sucursales" element={<Sucursales />} />
            <Route path="/ciudades" element={<Ciudades />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/reports" element={<ReportesLayout />}>
              <Route index element={<Reportes />} />
              <Route path="rentabilidad" element={<Rentabilidad />} />
            </Route>
          </Route>

          <Route path="/patients" element={<Clientes />} />
          <Route path="/pos" element={<PuntoVenta />} />
          <Route element={<RoleRoute allowedRoles={['dueno', 'administrador', 'dependiente']} />}>
            <Route path="/caja" element={<CajaOperativa />} />
          </Route>
          <Route
            path="/support"
            element={<div className="p-8 font-headline text-2xl font-bold">Ayuda (Próximamente)</div>}
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
