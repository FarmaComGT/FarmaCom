import React, { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, Search, X } from 'lucide-react';
import { buscarProductoPorLectura } from '../../api/lecturaProductos';
import EscanerCamaraModal from '../ui/EscanerCamaraModal';

export default function LecturaCodigoPOS({
  onSeleccionar, bloqueado, contexto, busqueda, onBusquedaChange,
  onBuscarAhora,
}) {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const campo = useRef(null);
  const solicitud = useRef(null);
  const bloqueo = useRef(false);
  const valor = busqueda ?? codigo;
  const cambiarValor = (nuevo) => {
    setCodigo(nuevo);
    onBusquedaChange?.(nuevo);
    setError('');
    setAviso('');
  };

  useEffect(() => {
    // Cambiar carrito/sucursal o cerrar la pantalla invalida una lectura pendiente.
    solicitud.current?.abort();
    bloqueo.current = false;
    setCargando(false);
    setCodigo('');
    setError('');
    setAviso('');
    setCamaraAbierta(false);
    return () => solicitud.current?.abort();
  }, [contexto]);

  useEffect(() => {
    if (!bloqueado) return;
    solicitud.current?.abort();
    bloqueo.current = false;
    setCargando(false);
    setCamaraAbierta(false);
  }, [bloqueado]);

  const procesarLectura = async (valorLeido, soloCodigo = false) => {
    if (bloqueado || bloqueo.current) return;
    const lectura = valorLeido.trim();
    if (!lectura) {
      setError('Escribe o escanea un código, nombre o presentación.');
      campo.current?.focus();
      return;
    }
    const control = new AbortController();
    solicitud.current = control;
    bloqueo.current = true;
    setCargando(true);
    setError('');
    setAviso('');
    const mostrarSugerencias = async () => {
      try {
        const resultados = await onBuscarAhora?.(lectura);
        if (control.signal.aborted) return;
        if (resultados?.length) setAviso('Selecciona un producto de los resultados para ver sus lotes.');
        else setError('No encontramos un código exacto ni productos disponibles. Revisa el código o busca por nombre.');
      } catch {
        if (!control.signal.aborted) setError('No se pudieron consultar los productos. Intenta de nuevo.');
      }
    };
    try {
      if (!/^[\x21-\x7E]{1,64}$/.test(lectura)) {
        await mostrarSugerencias();
        return;
      }
      const producto = await buscarProductoPorLectura(lectura, { signal: control.signal });
      if (control.signal.aborted) return;
      cambiarValor('');
      campo.current?.focus();
      onSeleccionar(producto);
    } catch (err) {
      if (control.signal.aborted) return;
      if (!soloCodigo && err.response?.status === 404 && onBuscarAhora) {
        await mostrarSugerencias();
        return;
      }
      setError(err.response?.data?.mensaje || err.message || 'No se pudo consultar el código. Intenta de nuevo.');
      campo.current?.focus();
      campo.current?.select();
    } finally {
      if (!control.signal.aborted) {
        bloqueo.current = false;
        setCargando(false);
      }
    }
  };

  return (
    <form className="pos-busqueda-unificada" onSubmit={(evento) => { evento.preventDefault(); void procesarLectura(valor); }} noValidate aria-label="Búsqueda de productos">
      <div className="pos-unified-input">
        <Search size={20} aria-hidden="true" />
        <input ref={campo} id="lectura-codigo" name="codigo_lectura" type="text"
          autoComplete="off" spellCheck={false} value={valor} maxLength={100}
          aria-label="Buscar productos"
          onChange={(evento) => cambiarValor(evento.target.value)}
          placeholder="Nombre, presentación o código…" readOnly={cargando} disabled={bloqueado}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'lectura-error' : undefined} />
        {valor && !cargando && (
          <button className="pos-unified-clear" type="button" aria-label="Limpiar búsqueda" disabled={bloqueado}
            onClick={() => { cambiarValor(''); campo.current?.focus(); }}><X size={18} aria-hidden="true" /></button>
        )}
        <button type="submit" disabled={cargando || bloqueado}>
          {cargando && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
          Buscar
        </button>
        <button className="pos-unified-camera" type="button" disabled={cargando || bloqueado}
          onClick={() => setCamaraAbierta(true)} aria-label="Escanear con cámara">
          <Camera size={18} aria-hidden="true" /><span>Cámara</span>
        </button>
      </div>
      <p id="lectura-error" className="pos-lectura-error" aria-live="polite">{error}</p>
      {aviso && <p aria-live="polite">{aviso}</p>}
      {camaraAbierta && <EscanerCamaraModal onClose={() => setCamaraAbierta(false)} onCodigo={(lectura) => {
        setCamaraAbierta(false);
        cambiarValor(lectura);
        void procesarLectura(lectura, true);
      }} />}
    </form>
  );
}
