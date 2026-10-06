import React, { useMemo, useState, useCallback } from 'react';
import InventarioSubNav from '../../components/inventario/InventarioSubNav.jsx';
import ProductoStatsGrid from '../../components/inventario/productos/ProductoStatsGrid.jsx';
import ProductoStatsBanner from '../../components/inventario/productos/ProductoStatsBanner.jsx';
import ProductoActionBar from '../../components/inventario/productos/ProductoActionBar.jsx';
import ProductoFilterPanel from '../../components/inventario/productos/ProductoFilterPanel.jsx';
import ProductoTable from '../../components/inventario/productos/ProductoTable.jsx';
import ProductoFormModal from '../../components/inventario/productos/ProductoFormModal.jsx';
import HistorialPrecioProductoModal from '../../components/inventario/productos/HistorialPrecioProductoModal.jsx';
import useProductos from '../../hooks/useProductos.js';
import useCategorias from '../../hooks/useCategorias.js';
import useCasas from '../../hooks/useCasas.js';
import useProveedores from '../../hooks/useProveedores.js';
import usePresentaciones from '../../hooks/usePresentaciones.js';
import { sufijoPresentacion } from '../../constants/presentaciones.js';
import { useAuth } from '../../context/AuthContext.jsx';

const siguienteCodigoMed = (productos) => {
  const numeros = (productos || [])
    .map((p) => /^MED(\d+)/.exec(p.codigo || ''))
    .filter(Boolean)
    .map((coincidencia) => Number(coincidencia[1]));

  const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `MED${String(siguiente).padStart(3, '0')}`;
};

const filtrosIniciales = {
  id_categoria: '',
  id_casa: '',
  id_presentacion: '',
  id_proveedor: '',
  activo: '',
};

export default function Productos() {
  const { usuario } = useAuth();
  const { productos, cargando, error, crear, actualizar, cambiarEstado } = useProductos();
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const { casas, cargando: cargandoCasas } = useCasas();
  const { proveedores, cargando: cargandoProveedores } = useProveedores();
  const {
    presentaciones,
    cargando: cargandoPresentaciones,
    crear: crearPresentacion,
    actualizar: actualizarPresentacion,
    eliminar: eliminarPresentacion,
  } = usePresentaciones();

  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [productoHistorial, setProductoHistorial] = useState(null);

  const cargandoDatos = cargandoCategorias || cargandoCasas || cargandoProveedores || cargandoPresentaciones;
  const codigoSugerido = useMemo(() => siguienteCodigoMed(productos), [productos]);
  
  const handleCrear = useCallback(() => {
    setModoEdicion(false);
    setProductoEditando(null);
    setErrorFormulario(null);
    setMostrarModal(true);
  }, []);

  const handleEditar = useCallback((producto) => {
    setModoEdicion(true);
    setProductoEditando(producto);
    setErrorFormulario(null);
    setMostrarModal(true);
  }, []);

  const handleCerrarModal = useCallback(() => {
    if (guardando) return;
    setMostrarModal(false);
    setProductoEditando(null);
    setErrorFormulario(null);
  }, [guardando]);

  const handleGuardar = useCallback(async (formulario) => {
    setErrorFormulario(null);

    const presentacionElegida = presentaciones.find(
      (p) => String(p.id_presentacion) === formulario.id_presentacion,
    );
    const sufijo = sufijoPresentacion(presentacionElegida?.nombre);

    const payload = {
      codigo: modoEdicion && productoEditando
        ? productoEditando.codigo
        : `${codigoSugerido}-${sufijo}`,
      nombre_comercial: formulario.nombre_comercial.trim(),
      nombre_generico: formulario.nombre_generico.trim(),
      concentracion: formulario.concentracion.trim() || null,
      id_presentacion: Number(formulario.id_presentacion),
      id_categoria: Number(formulario.id_categoria),
      id_casa: Number(formulario.id_casa),
      id_proveedor: formulario.id_proveedor ? Number(formulario.id_proveedor) : undefined,
      precio_compra: Number(formulario.precio_compra),
      stock_minimo: formulario.stock_minimo ? Number(formulario.stock_minimo) : undefined,
      meses_alerta_vencimiento: Number(formulario.meses_alerta_vencimiento),
      aplica_mayoreo: formulario.aplica_mayoreo,
    };

    try {
      setGuardando(true);
      if (modoEdicion && productoEditando) {
        await actualizar(productoEditando.id_producto, payload);
      } else {
        await crear(payload);
      }
      setMostrarModal(false);
      setProductoEditando(null);
    } catch (err) {
      setErrorFormulario(err.message || 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  }, [modoEdicion, productoEditando, crear, actualizar, codigoSugerido, presentaciones]);

  const handleCambiarEstado = useCallback(async (producto) => {
    setErrorAccion(null);
    try {
      setCambiandoEstadoId(producto.id_producto);
      await cambiarEstado(producto.id_producto, !producto.activo);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo cambiar el estado del producto.');
    } finally {
      setCambiandoEstadoId(null);
    }
  }, [cambiarEstado]);

  const onFiltroChange = useCallback((campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const termino = busqueda.trim().toLowerCase();

      const coincideBusqueda =
        !termino ||
        p.nombre_comercial?.toLowerCase().includes(termino) ||
        p.nombre_generico?.toLowerCase().includes(termino) ||
        p.codigo?.toLowerCase().includes(termino);

      const coincideCategoria =
        !filtros.id_categoria || String(p.id_categoria) === filtros.id_categoria;

      const coincideCasa =
        !filtros.id_casa || String(p.id_casa) === filtros.id_casa;

      const coincidePresentacion =
        !filtros.id_presentacion || String(p.id_presentacion) === filtros.id_presentacion;

      const coincideProveedor =
        !filtros.id_proveedor || String(p.id_proveedor) === filtros.id_proveedor;

      const coincideActivo =
        filtros.activo === '' ||
        String(p.activo) === filtros.activo;

      return coincideBusqueda && coincideCategoria && coincideCasa
        && coincidePresentacion && coincideProveedor && coincideActivo;
    });
  }, [productos, busqueda, filtros]);

  const totalActivos = useMemo(() => productos.filter((p) => p.activo).length, [productos]);
  const totalInactivos = useMemo(() => productos.filter((p) => !p.activo).length, [productos]);
  const totalConMayoreo = useMemo(() => productos.filter((p) => p.aplica_mayoreo).length, [productos]);
  const puedeVerHistorial = ['dueno', 'administrador'].includes(usuario?.rol);
  

  return (
    <div className="space-y-6">
      <InventarioSubNav />

      <div>
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
          Catálogo de Productos
        </h2>
      </div>

      <ProductoStatsGrid
        totalProductos={productos.length}
        totalActivos={totalActivos}
        totalInactivos={totalInactivos}
        totalConAlertaMayoreo={totalConMayoreo}
      />

      <ProductoActionBar
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        onCrear={handleCrear}
      />

      <ProductoFilterPanel
        filtros={filtros}
        onFiltroChange={onFiltroChange}
        categorias={categorias}
        casas={casas}
        proveedores={proveedores}
        presentaciones={presentaciones}
      />

      <ProductoStatsBanner
        totalFiltrados={productosFiltrados.length}
        totalProductos={productos.length}
      />

      {(error || errorAccion) && (
        <div className="bg-error-container/40 border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container font-medium">
          {error || errorAccion}
        </div>
      )}

      <ProductoTable
        cargando={cargando}
        productos={productosFiltrados}
        onEditar={handleEditar}
        onCambiarEstado={handleCambiarEstado}
        onVerHistorial={setProductoHistorial}
        puedeVerHistorial={puedeVerHistorial}
        cambiandoEstadoId={cambiandoEstadoId}
      />

      <ProductoFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        producto={productoEditando}
        codigoSugerido={codigoSugerido}
        categorias={categorias}
        casas={casas}
        proveedores={proveedores}
        presentaciones={presentaciones}
        cargandoDatos={cargandoDatos}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={handleCerrarModal}
        onSubmit={handleGuardar}
        onCrearPresentacion={crearPresentacion}
        onActualizarPresentacion={actualizarPresentacion}
        onEliminarPresentacion={eliminarPresentacion}
        puedeGestionarPresentaciones={['dueno', 'administrador'].includes(usuario?.rol)}
        puedeEliminarPresentaciones={usuario?.rol === 'dueno'}
      />

      <HistorialPrecioProductoModal
        isOpen={Boolean(productoHistorial)}
        producto={productoHistorial}
        onClose={() => setProductoHistorial(null)}
      />
    </div>
  );
}
