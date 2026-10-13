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
import Laboratorios from '../pages/Laboratorios.jsx';
import Usuarios from '../pages/Usuarios.jsx';
import Productos from '../pages/inventario/Productos.jsx';
import InventarioSucursal from '../pages/inventario/InventarioSucursal.jsx';
import Categorias from '../pages/inventario/Categorias.jsx';
import Proveedores from '../pages/inventario/Proveedores.jsx';
import Casas from '../pages/inventario/Casas.jsx';
import Clientes from '../pages/Clientes.jsx';
import PuntoVenta from '../pages/ventas/PuntoVenta.jsx';
import CajaOperativa from '../pages/caja/CajaOperativa.jsx';
import HistorialCaja from '../pages/caja/HistorialCaja.jsx';
import HistorialVentasLayout from '../layouts/HistorialVentasLayout.jsx';
import HistorialVentas from '../pages/ventas/HistorialVentas.jsx';
import ResumenProductosVentas from '../pages/ventas/ResumenProductosVentas.jsx';
import AdministracionCajas from '../pages/caja/AdministracionCajas.jsx';
import Pacientes from '../pages/laboratorio/Pacientes.jsx';
import PacientePerfil from '../pages/laboratorio/PacientePerfil.jsx';

const Reportes = lazy(() => import('../pages/reportes/Reportes.jsx'));
const Rentabilidad = lazy(() => import('../pages/reportes/Rentabilidad.jsx'));

const ROLES_FARMACIA = ['dueno', 'administrador', 'dependiente'];

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

          <Route element={<RoleRoute allowedRoles={ROLES_FARMACIA} />}>
            <Route path="/inventario">
              <Route index element={<Navigate to="productos" replace />} />
              <Route path="productos" element={<Productos />} />
              <Route path="stock" element={<InventarioSucursal />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="proveedores" element={<Proveedores />} />
              <Route path="casas" element={<Casas />} />
            </Route>
            <Route path="/patients" element={<Clientes />} />
            <Route path="/pos" element={<PuntoVenta />} />
          </Route>

          {/* Admin */}
          <Route element={<RoleRoute allowedRoles={['dueno', 'administrador']} />}>
            <Route path="/sucursales" element={<Sucursales />} />
            <Route path="/laboratorios" element={<Laboratorios />} />
            <Route path="/ciudades" element={<Ciudades />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/caja/historial" element={<HistorialCaja />} />
            <Route path="/caja/administracion" element={<AdministracionCajas />} />
            <Route path="/ventas/historial" element={<HistorialVentasLayout />}>
              <Route index element={<HistorialVentas />} />
              <Route path="productos" element={<ResumenProductosVentas />} />
            </Route>
            <Route path="/reports" element={<ReportesLayout />}>
              <Route index element={<Reportes />} />
              <Route path="rentabilidad" element={<Rentabilidad />} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={['dueno', 'administrador', 'laboratorista']} />}>
            <Route path="/laboratorio/pacientes" element={<Pacientes />} />
            <Route path="/laboratorio/pacientes/:id" element={<PacientePerfil />} />
          </Route>
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
