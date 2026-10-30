import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopNav from './TopNav.jsx';
import { Outlet, useLocation } from 'react-router-dom';
import './Navigation.css';

const ANCHO_ESCRITORIO = 768;
const CLAVE_PREFERENCIA_SIDEBAR = 'farmacom:sidebar-abierta';

const detectarEscritorio = () =>
  typeof window === 'undefined' || window.innerWidth >= ANCHO_ESCRITORIO;

const obtenerPreferenciaSidebar = () => {
  if (!detectarEscritorio()) {
    return false;
  }

  try {
    const preferenciaGuardada = window.localStorage.getItem(CLAVE_PREFERENCIA_SIDEBAR);
    return preferenciaGuardada === null ? true : preferenciaGuardada === 'true';
  } catch {
    return true;
  }
};

export default function MainLayout() {
  const location = useLocation();
  const esInventario = location.pathname === '/inventario';
  const anchoEscritorio = esInventario ? 1100 : ANCHO_ESCRITORIO;
  const [esEscritorio, setEsEscritorio] = useState(() => detectarEscritorio() && window.innerWidth >= anchoEscritorio);
  const [sidebarAbierta, setSidebarAbierta] = useState(() => window.innerWidth >= anchoEscritorio && obtenerPreferenciaSidebar());

  useEffect(() => {
    const manejarCambioDeTamano = () => {
      const siguienteEsEscritorio = window.innerWidth >= anchoEscritorio;

      if (siguienteEsEscritorio !== esEscritorio) {
        setEsEscritorio(siguienteEsEscritorio);
        setSidebarAbierta(
          siguienteEsEscritorio ? obtenerPreferenciaSidebar() : false,
        );
      }
    };

    window.addEventListener('resize', manejarCambioDeTamano);
    manejarCambioDeTamano();
    return () => window.removeEventListener('resize', manejarCambioDeTamano);
  }, [esEscritorio, anchoEscritorio]);

  useEffect(() => {
    if (!esEscritorio) {
      setSidebarAbierta(false);
    }
  }, [esEscritorio, location.pathname]);

  useEffect(() => {
    if (!esEscritorio) {
      return;
    }

    try {
      window.localStorage.setItem(
        CLAVE_PREFERENCIA_SIDEBAR,
        String(sidebarAbierta),
      );
    } catch {
      // La Sidebar sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  }, [esEscritorio, sidebarAbierta]);

  useEffect(() => {
    if (esEscritorio || !sidebarAbierta) {
      return undefined;
    }

    const elementoAnterior = document.activeElement;
    const panel = document.getElementById('sidebar-principal');
    const contenido = document.getElementById('contenido-principal');
    if (contenido) contenido.inert = true;
    panel?.querySelector('button')?.focus();
    const manejarEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarAbierta(false);
      }
      if (event.key === 'Tab' && panel) {
        const controles = [...panel.querySelectorAll('a[href], button:not(:disabled)')];
        const primero = controles[0];
        const ultimo = controles[controles.length - 1];
        if (event.shiftKey && document.activeElement === primero) {
          event.preventDefault(); ultimo?.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault(); primero?.focus();
        }
      }
    };

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', manejarEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      if (contenido) contenido.inert = false;
      const botonAbrir = document.querySelector('[aria-label="Mostrar menú lateral"]');
      if (botonAbrir) botonAbrir.focus();
      else if (elementoAnterior?.isConnected) elementoAnterior.focus();
      document.removeEventListener('keydown', manejarEscape);
    };
  }, [esEscritorio, sidebarAbierta]);

  const abrirSidebar = () => {
    setSidebarAbierta(true);
  };

  const cerrarSidebar = () => {
    setSidebarAbierta(false);
  };

  const cerrarSidebarAlNavegar = () => {
    if (!esEscritorio) {
      cerrarSidebar();
    }
  };

  return (
    <div data-layout={esEscritorio ? 'fixed' : 'overlay'} className={`app-shell flex min-h-screen bg-background relative ${location.pathname === '/inventario' ? 'inventory-shell' : ''}`}>
      
      <Sidebar
        abierta={sidebarAbierta}
        onCerrar={cerrarSidebar}
        onNavegar={cerrarSidebarAlNavegar}
      />

      {sidebarAbierta && !esEscritorio && (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          onClick={() => setSidebarAbierta(false)}
          className="shell-nav-backdrop fixed inset-0 z-30"
        />
      )}
      
      <a href="#contenido-principal" className="inventory-skip-link">Saltar al contenido</a>
      <main id="contenido-principal"
        className={`flex min-w-0 flex-1 flex-col relative z-10 transition-[margin] duration-300 ${
          sidebarAbierta ? 'md:ml-64' : 'md:ml-0'
        }`}
      >
        <TopNav sidebarAbierta={sidebarAbierta} onAbrirSidebar={abrirSidebar} />
        <div
          className={`shell-content mx-auto w-full min-w-0 p-4 sm:p-6 lg:p-8 ${
            sidebarAbierta && esEscritorio ? 'max-w-7xl' : 'max-w-none'
          }`}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
