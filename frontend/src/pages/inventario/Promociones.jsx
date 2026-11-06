import { useToast } from '../../context/ToastContext.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PromocionEstadoModal from '../../components/inventario/promociones/PromocionEstadoModal.jsx';
import PromocionFormModal from '../../components/inventario/promociones/PromocionFormModal.jsx';
import PromocionesTable from '../../components/inventario/promociones/PromocionesTable.jsx';
import ContentState from '../../components/ui/ContentState.jsx';
import { useAuth } from '../../context/AuthContext';
import useProductos from '../../hooks/useProductos';
import usePromociones from '../../hooks/usePromociones';
import useSucursales from '../../hooks/useSucursales';
import useLotesProducto from '../../hooks/useLotesProducto';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';
import Paginacion from '../../components/ui/Paginacion.jsx';
import { obtenerPrecioVentaMinimoDisponible } from '../../utils/promociones';
import styles from '../../styles/ManagementUI.module.css';

const formularioVacio = { id_sucursal: '', cantidad_minima: '1', precio_promocion: '', fecha_inicio: '', fecha_fin: '' };
const fechaInput = (valor) => (valor ? String(valor).slice(0, 10) : '');
const mensajeError = (error, predeterminado) => error.response?.data?.mensaje || error.message || predeterminado;

export default function Promociones() {
  const toast = useToast();
  const { sucursalActivaId } = useAuth();
  const { productos, cargando: cargandoProductos, error: errorProductos, refrescar: refrescarProductos } = useProductos();
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales, refrescar: refrescarSucursales } = useSucursales();
  const [searchParams] = useSearchParams();
  const busquedaProducto = searchParams.get('q') || '';
  const idProducto = searchParams.get('producto') || '';
  const filtroSucursal = searchParams.get('sucursal') || '';
  const { pagina, limite } = leerPaginacionURL(searchParams);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [promocionEditando, setPromocionEditando] = useState(null);
  const [promocionACambiarEstado, setPromocionACambiarEstado] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [formularioBase, setFormularioBase] = useState(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [campoError, setCampoError] = useState(null);
  const hayCambios = Object.keys(formularioVacio).some((campo) => formulario[campo] !== formularioBase[campo]);

  useEffect(() => {
    document.title = 'Promociones · FarmaCom';
  }, []);

  const actualizarParametro = (nombre, valor) => {
    actualizarVista({ [nombre]: valor }, true);
  };

  const productoSeleccionado = productos.find((producto) => Number(producto.id_producto) === Number(idProducto));

  useEffect(() => {
    if (productos.length > 0 && !productoSeleccionado) actualizarParametro('producto', String(productos[0].id_producto));
  }, [productos, productoSeleccionado]);

  const productosFiltrados = useMemo(() => {
    const termino = busquedaProducto.trim().toLocaleLowerCase('es');
    if (!termino) return productos;
    return productos.filter((producto) => [producto.codigo, producto.nombre_comercial, producto.nombre_generico].some((valor) => String(valor || '').toLocaleLowerCase('es').includes(termino)));
  }, [busquedaProducto, productos]);

  const { lotes, cargando: cargandoLotes, error: errorLotes, refrescar: refrescarLotes } = useLotesProducto(idProducto, { enabled: Boolean(idProducto) });
  const { promociones, paginacion, cargando: cargandoPromociones, error: errorPromociones, refrescar: refrescarPromociones, crear, actualizar, cambiarEstado } = usePromociones(idProducto, { pagina, limite, id_sucursal: filtroSucursal || undefined });
  const { actualizar: actualizarVista, crearDestino, onLimiteChange } = usePaginacionURL({ paginacion, cargando: cargandoPromociones });

  const promocionesFiltradas = useMemo(() => (
    filtroSucursal ? promociones.filter((promocion) => (
      Number(promocion.id_sucursal) === Number(filtroSucursal)
    )) : promociones
  ), [filtroSucursal, promociones]);
  const precioReferencia = useMemo(() => obtenerPrecioVentaMinimoDisponible(lotes, formulario.id_sucursal), [formulario.id_sucursal, lotes]);

  const abrirCrear = () => {
    if (!productoSeleccionado) return;
    const valores = { ...formularioVacio, id_sucursal: String(sucursalActivaId || sucursales[0]?.id_sucursal || '') };
    setPromocionEditando(null);
    setFormulario(valores);
    setFormularioBase(valores);
    setErrorFormulario(null);
    setCampoError(null);
    setModalAbierto(true);
  };

  const abrirEditar = (promocion) => {
    const valores = {
      id_sucursal: String(promocion.id_sucursal),
      cantidad_minima: String(promocion.cantidad_minima),
      precio_promocion: String(promocion.precio_promocion),
      fecha_inicio: fechaInput(promocion.fecha_inicio),
      fecha_fin: fechaInput(promocion.fecha_fin),
    };
    setPromocionEditando(promocion);
    setFormulario(valores);
    setFormularioBase(valores);
    setErrorFormulario(null);
    setCampoError(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (!guardando) setModalAbierto(false);
  };

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    if (errorFormulario) setErrorFormulario(null);
    if (campoError === name) setCampoError(null);
  };

  const mostrarErrorFormulario = (campo, mensaje) => {
    setCampoError(campo);
    setErrorFormulario(mensaje);
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario(null);
    setCampoError(null);
    if (!formulario.id_sucursal) return mostrarErrorFormulario('id_sucursal', 'Selecciona una sucursal.');
    if (!Number.isInteger(Number(formulario.cantidad_minima)) || Number(formulario.cantidad_minima) < 1) return mostrarErrorFormulario('cantidad_minima', 'La cantidad mínima debe ser un número entero mayor que cero.');
    if (!formulario.precio_promocion || Number(formulario.precio_promocion) <= 0) return mostrarErrorFormulario('precio_promocion', 'Ingresa un precio promocional válido.');
    if (!formulario.fecha_inicio) return mostrarErrorFormulario('fecha_inicio', 'Selecciona la fecha de inicio.');
    if (!formulario.fecha_fin) return mostrarErrorFormulario('fecha_fin', 'Selecciona la fecha de finalización.');
    if (formulario.fecha_fin <= formulario.fecha_inicio) return mostrarErrorFormulario('fecha_fin', 'La fecha de finalización debe ser posterior a la fecha de inicio.');
    if (precioReferencia === null) return mostrarErrorFormulario('precio_promocion', 'No hay lotes vendibles con precio para validar la promoción en esta sucursal.');
    if (Number(formulario.precio_promocion) >= precioReferencia) return mostrarErrorFormulario('precio_promocion', `El precio promocional debe ser menor que Q${precioReferencia.toFixed(2)}.`);

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
        toast.success('Promoción actualizada correctamente.');
      } else {
        await crear({ ...datos, id_sucursal: Number(formulario.id_sucursal) });
        toast.success('Promoción creada correctamente.');
      }
      setModalAbierto(false);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la promoción.'));
    } finally {
      setGuardando(false);
    }
  };

  const solicitarCambiarEstado = (promocion) => {
    setPromocionACambiarEstado(promocion);
  };

  const confirmarCambiarEstado = async () => {
    if (!promocionACambiarEstado) return;
    const nuevoEstado = !promocionACambiarEstado.activo;
    try {
      setCambiandoId(promocionACambiarEstado.id_promocion);
      await cambiarEstado(promocionACambiarEstado.id_promocion, nuevoEstado);
      toast.success(`Promoción ${nuevoEstado ? 'activada' : 'desactivada'} correctamente.`);
      setPromocionACambiarEstado(null);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cambiar el estado de la promoción.'));
    } finally {
      setCambiandoId(null);
    }
  };

  const reintentarCatalogos = () => {
    refrescarProductos();
    refrescarSucursales();
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="promociones-title">
      <header className={styles.heading}>
        <div>
          <h1 id="promociones-title">Promociones</h1>
          <p>Configura precios especiales por producto, sucursal, vigencia y cantidad mínima.</p>
        </div>
        <div className={styles.headingActions}>
          <button type="button" onClick={abrirCrear} disabled={!productoSeleccionado || cargandoSucursales} className={`${styles.button} ${styles.primary}`}><PlusCircle size={16} aria-hidden="true" />Nueva promoción</button>
        </div>
      </header>

      <div className={styles.filterGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Buscar producto</span>
          <input type="search" name="q" autoComplete="off" value={busquedaProducto} onChange={(evento) => actualizarParametro('q', evento.target.value)} placeholder="Código o nombre…" className={styles.input} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Producto</span>
          <select name="producto" value={idProducto} onChange={(evento) => actualizarParametro('producto', evento.target.value)} disabled={cargandoProductos} className={styles.input}>
            <option value="">Selecciona un producto</option>
            {productosFiltrados.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.codigo} · {producto.nombre_comercial}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Filtrar por sucursal</span>
          <select name="sucursal" value={filtroSucursal} onChange={(evento) => actualizarParametro('sucursal', evento.target.value)} disabled={cargandoSucursales} className={styles.input}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}
          </select>
        </label>
      </div>

      {(errorProductos || errorSucursales) && <ContentState compact variant="error" title="No se pudieron cargar los catálogos" message={errorProductos || errorSucursales} onRetry={reintentarCatalogos} />}
      {errorLotes && <ContentState compact variant="error" title="No se pudieron consultar los precios de referencia" message={errorLotes} onRetry={refrescarLotes} />}
      {errorPromociones && promociones.length > 0 && <p role="alert" className={styles.alert}>{errorPromociones}</p>}
      <p className={styles.resultCount} aria-live="polite"><strong>{paginacion?.total ?? 0}</strong> promociones encontradas</p>

      <PromocionesTable promociones={promocionesFiltradas} cargando={cargandoPromociones} error={errorPromociones} productoSeleccionado={Boolean(productoSeleccionado)} hayFiltroSucursal={Boolean(filtroSucursal)} cambiandoId={cambiandoId} onRetry={refrescarPromociones} onEditar={abrirEditar} onCambiarEstado={solicitarCambiarEstado} />

      {!errorPromociones && <Paginacion paginacion={paginacion} crearDestino={crearDestino}
        onLimiteChange={onLimiteChange} cargando={cargandoPromociones} sustantivo="promociones" />}

      <PromocionFormModal isOpen={modalAbierto} modoEdicion={Boolean(promocionEditando)} producto={productoSeleccionado} sucursales={sucursales} formulario={formulario} hayCambios={hayCambios} guardando={guardando} cargandoPrecioReferencia={cargandoLotes} precioReferencia={precioReferencia} error={errorFormulario} campoError={campoError} onChange={manejarCambio} onClose={cerrarModal} onSubmit={manejarGuardar} />
      <PromocionEstadoModal isOpen={Boolean(promocionACambiarEstado)} promocion={promocionACambiarEstado} procesando={Boolean(cambiandoId)} error={null} onClose={() => { if (!cambiandoId) setPromocionACambiarEstado(null); }} onConfirm={confirmarCambiarEstado} />
    </section>
  );
}
