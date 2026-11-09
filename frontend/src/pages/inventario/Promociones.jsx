import React, { useEffect, useRef, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import useSucursales from '../../hooks/useSucursales';
import usePromociones from '../../hooks/usePromociones';
import usePromocionReferencia from '../../hooks/usePromocionReferencia';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';
import PromocionEstadoModal from '../../components/inventario/promociones/PromocionEstadoModal.jsx';
import PromocionFormModal from '../../components/inventario/promociones/PromocionFormModal.jsx';
import PromocionesTable from '../../components/inventario/promociones/PromocionesTable.jsx';
import Paginacion from '../../components/ui/Paginacion.jsx';
import ContentState from '../../components/ui/ContentState.jsx';
import styles from '../../styles/ManagementUI.module.css';
import local from '../../components/inventario/promociones/Promociones.module.css';

const hoyLocal = () => { const fecha = new Date(); return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const vacio = (sucursal) => ({ nombre: '', id_sucursal: String(sucursal || ''), cantidad_minima: '1', cantidad_maxima: '', precio_promocion: '', fecha_inicio: hoyLocal(), fecha_fin: '', sin_fin: false });
const mensaje = (error) => error.response?.data?.mensaje || error.message || 'No se pudo completar la operación.';

export default function Promociones() {
  const toast = useToast();
  const { sucursalActivaId, usuario } = useAuth();
  const puedeGestionar = ['dueno', 'administrador'].includes(usuario?.rol);
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales, refrescar: refrescarSucursales } = useSucursales();
  const [params, setParams] = useSearchParams();
  const busqueda = params.get('q') || '';
  const estado = params.get('estado') || 'vigente';
  const idProducto = params.get('producto') || '';
  const sucursal = usuario?.rol === 'dependiente' ? String(usuario.id_sucursal)
    : params.get('sucursal') ?? String(sucursalActivaId || 'todas');
  const { pagina, limite } = leerPaginacionURL(params);
  const [termino, setTermino] = useState(busqueda);
  useEffect(() => { const timer = setTimeout(() => setTermino(busqueda), 250); return () => clearTimeout(timer); }, [busqueda]);
  const listado = usePromociones(idProducto || null, { global: true, pagina, limite, estado, busqueda: termino.trim() || undefined, id_sucursal: sucursal === 'todas' ? undefined : sucursal || undefined });
  const { actualizar, crearDestino, onLimiteChange } = usePaginacionURL({ paginacion: listado.paginacion, cargando: listado.cargando });
  const editarId = params.get('editar');
  const creando = params.get('crear') === '1';
  const abierto = puedeGestionar && Boolean(editarId || creando);
  const [producto, setProducto] = useState(null);
  const [contexto, setContexto] = useState(null);
  const [formulario, setFormulario] = useState(vacio(sucursalActivaId));
  const [base, setBase] = useState('');
  const [cargandoFormulario, setCargandoFormulario] = useState(false);
  const [falloCarga, setFalloCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [errores, setErrores] = useState({});
  const [errorFormulario, setErrorFormulario] = useState('');
  const [conflicto, setConflicto] = useState(null);
  const [porCambiar, setPorCambiar] = useState(null);
  const [cambiando, setCambiando] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');
  const referencia = usePromocionReferencia(producto?.id_producto, formulario.id_sucursal, abierto);
  const identidadFormulario = (datos, seleccionado) => JSON.stringify([datos, seleccionado?.id_producto || null]);
  const hayCambios = abierto && !cargandoFormulario && identidadFormulario(formulario, producto) !== base;

  useEffect(() => { document.title = 'Promociones · FarmaCom'; }, []);
  useEffect(() => {
    if (!idProducto) { setContexto(null); return; }
    const controller = new AbortController();
    setContexto(null);
    api.get('/productos/' + idProducto, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setContexto(data); }).catch(() => {});
    return () => controller.abort();
  }, [idProducto]);
  useEffect(() => {
    if (!abierto) return;
    const controller = new AbortController();
    const nuevos = vacio(sucursal === 'todas' ? sucursalActivaId : sucursal);
    setErrores({}); setErrorFormulario(''); setConflicto(null); setFalloCarga(false);
    setFormulario(nuevos); setProducto(null); setBase(identidadFormulario(nuevos, null));
    const url = editarId ? '/promociones/' + editarId : idProducto ? '/productos/' + idProducto : null;
    setCargandoFormulario(Boolean(url));
    if (url) api.get(url, { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const valores = editarId ? { nombre: data.nombre || '', id_sucursal: String(data.id_sucursal), cantidad_minima: String(data.cantidad_minima), cantidad_maxima: data.cantidad_maxima == null ? '' : String(data.cantidad_maxima), precio_promocion: String(data.precio_promocion), fecha_inicio: String(data.fecha_inicio).slice(0, 10), fecha_fin: data.fecha_fin ? String(data.fecha_fin).slice(0, 10) : '', sin_fin: data.fecha_fin == null } : nuevos;
      setFormulario(valores); setProducto(data); setBase(identidadFormulario(valores, data));
    }).catch((error) => { if (!controller.signal.aborted) { setErrorFormulario(mensaje(error)); setFalloCarga(true); } })
      .finally(() => { if (!controller.signal.aborted) setCargandoFormulario(false); });
    return () => controller.abort();
  }, [abierto, editarId, idProducto, intento]);

  const modalURL = (cambios) => setParams((actuales) => {
    const siguientes = new URLSearchParams(actuales);
    Object.entries(cambios).forEach(([campo, valor]) => { if (valor == null) siguientes.delete(campo); else siguientes.set(campo, valor); });
    return siguientes;
  });
  const cerrar = () => modalURL({ crear: null, editar: null });
  const manejarCambio = ({ target: { name, value, type, checked } }) => {
    setFormulario((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }));
    setErrores((actual) => { const siguientes = { ...actual }; delete siguientes[name]; if (name === 'sin_fin') delete siguientes.fecha_fin; return siguientes; });
    setErrorFormulario(''); setConflicto(null);
  };
  const guardar = async (e) => {
    e.preventDefault();
    if (guardandoRef.current) return;
    const problemas = {};
    if (!producto) problemas.id_producto = 'Busca y selecciona un producto.';
    if (!formulario.id_sucursal) problemas.id_sucursal = 'Selecciona una sucursal.';
    if (formulario.nombre.trim().length > 120) problemas.nombre = 'Usa un nombre de hasta 120 caracteres.';
    if (!Number.isInteger(Number(formulario.cantidad_minima)) || Number(formulario.cantidad_minima) < 1) problemas.cantidad_minima = 'La cantidad mínima debe ser un entero mayor que cero.';
    if (formulario.cantidad_maxima !== '') {
      const maxima = Number(formulario.cantidad_maxima);
      if (!Number.isInteger(maxima) || maxima < 1 || maxima > 2147483647) problemas.cantidad_maxima = 'Ingresa un total entero mayor que cero.';
      else if (maxima < Number(formulario.cantidad_minima)) problemas.cantidad_maxima = 'El total no puede ser menor que la cantidad mínima por venta.';
      else if (maxima < Number(producto?.cantidad_vendida || 0) + Number(producto?.cantidad_reservada || 0)) problemas.cantidad_maxima = 'El total no puede ser menor que las unidades vendidas y reservadas.';
    }
    if (!Number.isFinite(Number(formulario.precio_promocion)) || Number(formulario.precio_promocion) <= 0) problemas.precio_promocion = 'Ingresa un precio por unidad mayor que cero.';
    else if (referencia.cargando) problemas.precio_promocion = 'Espera a que termine la consulta del precio normal.';
    else if (producto && formulario.id_sucursal && referencia.precio == null) problemas.precio_promocion = referencia.error || 'No hay lotes vendibles con precio en esta sucursal.';
    else if (referencia.precio != null && Math.round(Number(formulario.precio_promocion) * 100) >= Math.round(referencia.precio * 100)) problemas.precio_promocion = 'El precio debe ser menor que el precio normal mínimo.';
    if (!formulario.fecha_inicio) problemas.fecha_inicio = 'Selecciona la fecha de inicio.';
    if (!formulario.sin_fin && !formulario.fecha_fin) problemas.fecha_fin = 'Selecciona la fecha de finalización o marca la opción sin fecha.';
    else if (!formulario.sin_fin && formulario.fecha_fin <= formulario.fecha_inicio) problemas.fecha_fin = 'La fecha de finalización debe ser posterior al inicio.';
    setErrores(problemas); setErrorFormulario(''); setConflicto(null);
    if (Object.keys(problemas).length || falloCarga) return;
    const datos = { nombre: formulario.nombre.trim() || null, cantidad_minima: Number(formulario.cantidad_minima), cantidad_maxima: formulario.cantidad_maxima === '' ? null : Number(formulario.cantidad_maxima), precio_promocion: Number(formulario.precio_promocion), fecha_inicio: formulario.fecha_inicio, fecha_fin: formulario.sin_fin ? null : formulario.fecha_fin };
    try {
      guardandoRef.current = true; setGuardando(true);
      if (editarId) await listado.actualizar(Number(editarId), datos);
      else await listado.crear({ ...datos, id_producto: producto.id_producto, id_sucursal: Number(formulario.id_sucursal) });
      toast.success(editarId ? 'Promoción actualizada correctamente.' : 'Promoción creada correctamente.');
      cerrar();
    } catch (error) {
      setErrorFormulario(mensaje(error));
      const detalle = error.response?.data?.errores?.find((item) => item.id_promocion);
      setConflicto(detalle || null);
      if (detalle) setErrores({ fecha_inicio: mensaje(error) });
      else if (/cupo|cantidad máxima/.test(mensaje(error))) setErrores({ cantidad_maxima: mensaje(error) });
    } finally { guardandoRef.current = false; setGuardando(false); }
  };
  const confirmarEstado = async () => {
    if (!porCambiar || cambiando) return;
    setCambiando(true); setErrorEstado('');
    try { await listado.cambiarEstado(porCambiar.id_promocion, !porCambiar.activo); setPorCambiar(null); toast.success('Estado de la promoción actualizado.'); }
    catch (error) { setErrorEstado(mensaje(error)); }
    finally { setCambiando(false); }
  };
  const nueva = () => modalURL({ crear: '1', editar: null });
  return <section className={styles.page} aria-labelledby="promociones-title">
    <header className={styles.heading}><div><h1 id="promociones-title">Promociones</h1><p>Precios especiales por cantidad y sucursal.</p></div>{puedeGestionar && <button type="button" onClick={nueva} className={styles.button + ' ' + styles.primary}><PlusCircle size={16} aria-hidden="true"/>Nueva promoción</button>}</header>
    <div className={local.filters}>
      <label className={styles.field}><span>Buscar promociones</span><input type="search" name="q" autoComplete="off" value={busqueda} onChange={(e) => actualizar({ q: e.target.value }, true)} placeholder="Nombre de promoción, producto o código…" className={styles.input}/></label>
      {usuario?.rol !== 'dependiente' && <label className={styles.field}><span>Sucursal</span><select name="sucursal" value={sucursal} onChange={(e) => actualizar({ sucursal: e.target.value })} disabled={cargandoSucursales} className={styles.input}><option value="todas">Todas las sucursales</option>{sucursales.map((s) => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_sucursal}</option>)}</select></label>}
      <label className={styles.field}><span>Estado</span><select name="estado" value={estado} onChange={(e) => actualizar({ estado: e.target.value })} className={styles.input}><option value="vigente">Vigentes</option><option value="agotada">Cupo agotado</option><option value="programada">Programadas</option><option value="finalizada">Finalizadas</option><option value="desactivada">Desactivadas</option><option value="todas">Todos los estados</option></select></label>
    </div>
    {idProducto && <div className={local.context}><span>Producto: <strong>{contexto?.nombre_comercial || 'Producto seleccionado'}</strong></span><button type="button" className={styles.button} onClick={() => actualizar({ producto: null })}>Mostrar todos los productos</button></div>}
    {errorSucursales && <ContentState compact variant="error" title="No se pudieron cargar las sucursales" message={errorSucursales} onRetry={refrescarSucursales}/>}
    <p className={styles.resultCount} aria-live="polite">{listado.cargando ? 'Buscando promociones…' : new Intl.NumberFormat('es-GT').format(listado.paginacion?.total ?? listado.promociones.length) + ' promociones encontradas'}</p>
    <div id="listado-promociones"><PromocionesTable promociones={listado.promociones} cargando={listado.cargando || termino !== busqueda} error={listado.error} cambiandoId={cambiando ? porCambiar?.id_promocion : null} onRetry={listado.refrescar} onEditar={(p) => modalURL({ editar: String(p.id_promocion), crear: null })} onCambiarEstado={(p) => { setErrorEstado(''); setPorCambiar(p); }} puedeGestionar={puedeGestionar} onCrear={nueva} onLimpiar={() => actualizar({ q: '', estado: 'todas', sucursal: 'todas', producto: null })}/></div>
    {!listado.error && <Paginacion paginacion={listado.paginacion} crearDestino={crearDestino} onLimiteChange={onLimiteChange} cargando={listado.cargando} sustantivo="promociones" controles="listado-promociones"/>}
    <PromocionFormModal isOpen={abierto} modoEdicion={Boolean(editarId)} producto={producto} onProducto={(p) => { setProducto(p); setErrores({}); }} sucursales={sucursales} formulario={formulario} hayCambios={hayCambios} guardando={guardando} cargando={cargandoFormulario} precioReferencia={referencia.precio} cargandoPrecioReferencia={referencia.cargando} errorReferencia={referencia.error} onReintentarReferencia={referencia.reintentar} errores={errores} error={errorFormulario} conflicto={conflicto} onChange={manejarCambio} onClose={cerrar} onSubmit={guardar} onReintentar={falloCarga ? () => setIntento((v) => v + 1) : undefined}/>
    <PromocionEstadoModal isOpen={Boolean(porCambiar)} promocion={porCambiar} procesando={cambiando} error={errorEstado} onClose={() => { if (!cambiando) setPorCambiar(null); }} onConfirm={confirmarEstado}/>
  </section>;
}
