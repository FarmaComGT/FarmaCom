import React, { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle } from 'lucide-react';
import api from '../../../api/axios';
import EscanerCamaraModal from '../../ui/EscanerCamaraModal';
import LectorMovilButton from '../../ui/LectorMovilButton';
import styles from '../../../styles/ManagementUI.module.css';
import local from './Promociones.module.css';

export default function PromocionProductoPicker({ producto, onSeleccionar, bloqueado, error }) {
  const [busqueda, setBusqueda] = useState('');
  const [respuesta, setRespuesta] = useState({ termino: '', datos: [], error: '' });
  const [intento, setIntento] = useState(0);
  const [leyendo, setLeyendo] = useState(false);
  const [errorLectura, setErrorLectura] = useState('');
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const ref = useRef(null);
  const cambiarRef = useRef(null);
  const lecturaActual = useRef(null);
  const termino = busqueda.trim();
  const cargando = Boolean(termino && respuesta.termino !== termino);

  useEffect(() => () => lecturaActual.current?.abort(), []);
  useEffect(() => {
    if (producto || bloqueado) {
      lecturaActual.current?.abort();
      setLeyendo(false);
      setCamaraAbierta(false);
    }
  }, [producto, bloqueado]);
  useEffect(() => {
    if (producto || !termino || leyendo || bloqueado) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api.get('/productos/seleccion', { params: { busqueda: termino, limite: 10 }, signal: controller.signal })
        .then(({ data }) => { if (!controller.signal.aborted) setRespuesta({ termino, datos: data, error: '' }); })
        .catch(() => { if (!controller.signal.aborted) setRespuesta({ termino, datos: [], error: 'No se pudieron buscar productos.' }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [termino, producto, intento, leyendo, bloqueado]);

  const seleccionar = (item) => {
    onSeleccionar(item);
    requestAnimationFrame(() => cambiarRef.current?.focus());
  };
  const leerCodigo = async (valor) => {
    if (bloqueado || producto) return;
    const codigo = typeof valor === 'string' ? valor.trim() : '';
    lecturaActual.current?.abort();
    setCamaraAbierta(false);
    setErrorLectura('');
    if (!/^[\x21-\x7E]{1,64}$/.test(codigo)) {
      setLeyendo(false);
      setErrorLectura('El código debe contener de 1 a 64 caracteres visibles, sin espacios.');
      requestAnimationFrame(() => ref.current?.focus());
      return;
    }
    const controller = new AbortController();
    lecturaActual.current = controller;
    setBusqueda(codigo);
    setLeyendo(true);
    try {
      const { data } = await api.get('/productos/seleccion/lectura', { params: { codigo }, signal: controller.signal });
      if (!controller.signal.aborted) seleccionar(data);
    } catch (fallo) {
      if (!controller.signal.aborted) {
        setErrorLectura(fallo.response?.data?.mensaje || 'No se pudo consultar el código. Intenta nuevamente o busca por nombre.');
        requestAnimationFrame(() => ref.current?.focus());
      }
    } finally {
      if (!controller.signal.aborted) setLeyendo(false);
    }
  };
  const cambiarBusqueda = (e) => {
    lecturaActual.current?.abort();
    setLeyendo(false);
    setErrorLectura('');
    setBusqueda(e.target.value);
  };

  if (producto) return <div className={local.selected}>
    <div><strong>{producto.nombre_comercial}</strong>
      <span>{[producto.codigo, producto.concentracion, producto.presentacion].filter(Boolean).join(' · ')}</span>
      {producto.codigo_barras && <span>Código de barras: {producto.codigo_barras}</span>}
    </div>
    {!bloqueado && <button ref={cambiarRef} type="button" className={styles.button} onClick={() => {
      onSeleccionar(null); setBusqueda(''); setErrorLectura('');
      requestAnimationFrame(() => ref.current?.focus());
    }}>Cambiar producto</button>}
  </div>;

  return <div className={styles.field}>
    <label htmlFor="promocion-producto" className="campo-requerido">Buscar producto</label>
    <div className={local.scanRow}>
      <input aria-required="true" ref={ref} id="promocion-producto" name="id_producto" type="search" autoComplete="off" spellCheck={false}
        value={busqueda} onChange={cambiarBusqueda} disabled={bloqueado} className={styles.input}
        placeholder="Nombre, código o código de barras…" aria-invalid={Boolean(error || errorLectura)} aria-describedby="promocion-producto-ayuda"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void leerCodigo(busqueda); } }} />
      <button type="button" className={styles.button} disabled={bloqueado || leyendo} onClick={() => setCamaraAbierta(true)} aria-label="Escanear producto de la promoción con cámara"><Camera size={18} aria-hidden="true" />Cámara</button>
      <LectorMovilButton destino="promocion" contexto="selector-promocion" bloqueado={bloqueado || leyendo || camaraAbierta} onCodigo={leerCodigo} />
    </div>
    <p id="promocion-producto-ayuda" className={error || errorLectura ? styles.fieldError : styles.helpText} aria-live="polite">
      {error || errorLectura || 'Busca por nombre o escanea el código. El Enter del lector solo selecciona el producto.'}
    </p>
    <div aria-live="polite">{leyendo ? <p className={styles.helpText}><LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />Consultando código…</p> : cargando ? <p className={styles.helpText}>Buscando productos…</p> : termino && respuesta.error ? <p role="alert">{respuesta.error} <button type="button" className={styles.button} onClick={() => setIntento((v) => v + 1)}>Reintentar</button></p> : termino && !respuesta.datos.length && !errorLectura ? <p>No hay productos que coincidan. Prueba otro nombre o código.</p> : null}</div>
    {!leyendo && !cargando && !respuesta.error && termino && <ul className={local.results} aria-label="Productos encontrados">{respuesta.datos.map((item) => <li key={item.id_producto}><button type="button" disabled={bloqueado} className={local.result} onClick={() => seleccionar(item)}><strong>{item.nombre_comercial}</strong>{item.nombre_generico && <span>Genérico: {item.nombre_generico}</span>}<span>{[item.codigo, item.concentracion, item.presentacion].filter(Boolean).join(' · ')}</span></button></li>)}</ul>}
    {camaraAbierta && <EscanerCamaraModal onClose={() => { setCamaraAbierta(false); requestAnimationFrame(() => ref.current?.focus()); }} onCodigo={leerCodigo} />}
  </div>;
}
