import React, { useEffect, useMemo, useState } from 'react';
import { BadgePercent, PlusCircle, Search } from 'lucide-react';
import InventarioSubNav from '../../components/inventario/InventarioSubNav';
import PromocionFormModal from '../../components/inventario/promociones/PromocionFormModal';
import PromocionesTable from '../../components/inventario/promociones/PromocionesTable';
import { useAuth } from '../../context/AuthContext';
import useProductos from '../../hooks/useProductos';
import usePromociones from '../../hooks/usePromociones';
import useSucursales from '../../hooks/useSucursales';
import useLotesProducto from '../../hooks/useLotesProducto';
import { obtenerPrecioVentaMinimoDisponible } from '../../utils/promociones';

const formularioVacio = {
  id_sucursal: '',
  cantidad_minima: '1',
  precio_promocion: '',
  fecha_inicio: '',
  fecha_fin: '',
};

const fechaInput = (valor) => (valor ? String(valor).slice(0, 10) : '');
const mensajeError = (error, predeterminado) => (
  error.response?.data?.mensaje || error.message || predeterminado
);

export default function Promociones() {
  const { sucursalActivaId } = useAuth();
  const { productos, cargando: cargandoProductos, error: errorProductos } = useProductos();
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [idProducto, setIdProducto] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [promocionEditando, setPromocionEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const productosFiltrados = useMemo(() => {
    const termino = busquedaProducto.trim().toLocaleLowerCase('es');
    if (!termino) return productos;
    return productos.filter((producto) => [
      producto.codigo,
      producto.nombre_comercial,
      producto.nombre_generico,
    ].some((valor) => String(valor || '').toLocaleLowerCase('es').includes(termino)));
  }, [busquedaProducto, productos]);

  useEffect(() => {
    if (!idProducto && productos.length > 0) {
      setIdProducto(String(productos[0].id_producto));
    }
  }, [idProducto, productos]);

  const productoSeleccionado = productos.find(
    (producto) => Number(producto.id_producto) === Number(idProducto),
  );
  const {
    lotes,
    cargando: cargandoLotes,
    error: errorLotes,
  } = useLotesProducto(idProducto, { enabled: Boolean(idProducto) });
  const {
    promociones,
    cargando: cargandoPromociones,
    error: errorPromociones,
    crear,
    actualizar,
    cambiarEstado,
  } = usePromociones(idProducto);

  const promocionesFiltradas = useMemo(() => (
    filtroSucursal
      ? promociones.filter((promocion) => Number(promocion.id_sucursal) === Number(filtroSucursal))
      : promociones
  ), [filtroSucursal, promociones]);
  const precioReferencia = useMemo(() => obtenerPrecioVentaMinimoDisponible(
    lotes,
    formulario.id_sucursal,
  ), [formulario.id_sucursal, lotes]);

  const abrirCrear = () => {
    if (!productoSeleccionado) return;
    setPromocionEditando(null);
    setFormulario({
      ...formularioVacio,
      id_sucursal: String(sucursalActivaId || sucursales[0]?.id_sucursal || ''),
    });
    setErrorFormulario(null);
    setModalAbierto(true);
  };

  const abrirEditar = (promocion) => {
    setPromocionEditando(promocion);
    setFormulario({
      id_sucursal: String(promocion.id_sucursal),
      cantidad_minima: String(promocion.cantidad_minima),
      precio_promocion: String(promocion.precio_promocion),
      fecha_inicio: fechaInput(promocion.fecha_inicio),
      fecha_fin: fechaInput(promocion.fecha_fin),
    });
    setErrorFormulario(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (!guardando) setModalAbierto(false);
  };

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario(null);
    if (formulario.fecha_fin <= formulario.fecha_inicio) {
      setErrorFormulario('La fecha de finalización debe ser posterior a la fecha de inicio.');
      return;
    }
    if (precioReferencia === null) {
      setErrorFormulario(
        'No hay lotes vendibles con precio para validar la promoción en esta sucursal.',
      );
      return;
    }
    if (Number(formulario.precio_promocion) >= precioReferencia) {
      setErrorFormulario(
        `El precio promocional debe ser menor que Q${precioReferencia.toFixed(2)}.`,
      );
      return;
    }

    const datos = {
      cantidad_minima: Number(formulario.cantidad_minima),
      precio_promocion: Number(formulario.precio_promocion),
      fecha_inicio: formulario.fecha_inicio,
      fecha_fin: formulario.fecha_fin,
    };

    try {
      setGuardando(true);
      if (promocionEditando) {
        await actualizar(promocionEditando.id_promocion, datos);
        setMensaje('Promoción actualizada correctamente.');
      } else {
        await crear({ ...datos, id_sucursal: Number(formulario.id_sucursal) });
        setMensaje('Promoción creada correctamente.');
      }
      setModalAbierto(false);
    } catch (error) {
      setErrorFormulario(mensajeError(error, 'No se pudo guardar la promoción.'));
    } finally {
      setGuardando(false);
    }
  };

  const manejarEstado = async (promocion) => {
    const nuevoEstado = !promocion.activo;
    try {
      setErrorAccion(null);
      setMensaje(null);
      setCambiandoId(promocion.id_promocion);
      await cambiarEstado(promocion.id_promocion, nuevoEstado);
      setMensaje(`Promoción ${nuevoEstado ? 'activada' : 'desactivada'} correctamente.`);
    } catch (error) {
      setErrorAccion(mensajeError(error, 'No se pudo cambiar el estado de la promoción.'));
    } finally {
      setCambiandoId(null);
    }
  };

  const errorCarga = errorProductos || errorSucursales || errorPromociones || errorLotes;

  return (
    <div className="space-y-6">
      <InventarioSubNav />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <BadgePercent className="h-6 w-6" />
            <h1 className="font-headline text-2xl font-extrabold">Promociones</h1>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Configura precios especiales por producto, sucursal, vigencia y cantidad mínima.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          disabled={!productoSeleccionado || cargandoSucursales}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/15 disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" />
          Nueva promoción
        </button>
      </header>

      <section className="grid gap-4 rounded-2xl bg-surface-container-low p-4 lg:grid-cols-[1fr_1fr_0.8fr]">
        <label className="text-sm font-bold text-slate-700">
          Buscar producto
          <span className="relative mt-1 block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busquedaProducto}
              onChange={(evento) => setBusquedaProducto(evento.target.value)}
              placeholder="Código o nombre"
              className="w-full rounded-xl border-none bg-white py-2.5 pl-10 pr-4 font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </span>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Producto
          <select
            value={idProducto}
            onChange={(evento) => setIdProducto(evento.target.value)}
            disabled={cargandoProductos}
            className="mt-1 w-full rounded-xl border-none bg-white px-4 py-2.5 font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Selecciona un producto</option>
            {productosFiltrados.map((producto) => (
              <option key={producto.id_producto} value={producto.id_producto}>
                {producto.codigo} · {producto.nombre_comercial}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Filtrar por sucursal
          <select
            value={filtroSucursal}
            onChange={(evento) => setFiltroSucursal(evento.target.value)}
            disabled={cargandoSucursales}
            className="mt-1 w-full rounded-xl border-none bg-white px-4 py-2.5 font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                {sucursal.nombre_sucursal}
              </option>
            ))}
          </select>
        </label>
      </section>

      {errorCarga && (
        <p role="alert" className="rounded-xl border border-error/20 bg-error-container/40 px-4 py-3 text-sm font-semibold text-on-error-container">
          {errorCarga}
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="rounded-xl border border-error/20 bg-error-container/40 px-4 py-3 text-sm font-semibold text-on-error-container">
          {errorAccion}
        </p>
      )}
      {mensaje && (
        <p role="status" className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          {mensaje}
        </p>
      )}

      <PromocionesTable
        promociones={promocionesFiltradas}
        cargando={cargandoPromociones}
        cambiandoId={cambiandoId}
        onEditar={abrirEditar}
        onCambiarEstado={manejarEstado}
      />

      <PromocionFormModal
        isOpen={modalAbierto}
        modoEdicion={Boolean(promocionEditando)}
        producto={productoSeleccionado}
        sucursales={sucursales}
        formulario={formulario}
        guardando={guardando}
        cargandoPrecioReferencia={cargandoLotes}
        precioReferencia={precioReferencia}
        error={errorFormulario}
        onChange={manejarCambio}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
      />
    </div>
  );
}
