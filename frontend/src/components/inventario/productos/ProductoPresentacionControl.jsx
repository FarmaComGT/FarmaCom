import React, { useEffect, useState } from 'react';
import { ChevronDown, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import PresentacionDeleteModal from './PresentacionDeleteModal.jsx';
import PresentacionQuickCreateModal from './PresentacionQuickCreateModal.jsx';

export default function ProductoPresentacionControl({
  isOpen,
  presentaciones,
  presentacionSeleccionada,
  cargandoDatos,
  puedeGestionar,
  puedeEliminar,
  onChange,
  onSeleccionar,
  onCrear,
  onActualizar,
  onEliminar,
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [presentacionEditando, setPresentacionEditando] = useState(null);
  const [presentacionAEliminar, setPresentacionAEliminar] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setMostrarFormulario(false);
    setPresentacionEditando(null);
    setPresentacionAEliminar(null);
    setErrorEliminar(null);
  }, [isOpen]);

  const guardar = async (datos) => {
    try {
      setProcesando(true);
      const guardada = presentacionEditando
        ? await onActualizar(presentacionEditando.id_presentacion, datos)
        : await onCrear(datos);
      onSeleccionar(guardada.id_presentacion);
      setMostrarFormulario(false);
      setPresentacionEditando(null);
    } finally {
      setProcesando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!presentacionAEliminar) return;
    try {
      setProcesando(true);
      setErrorEliminar(null);
      await onEliminar(presentacionAEliminar.id_presentacion);
      onSeleccionar(null);
      setPresentacionAEliminar(null);
    } catch (error) {
      setErrorEliminar(error.response?.data?.mensaje || 'No se pudo eliminar la presentación.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="id_presentacion" className="text-sm font-semibold text-slate-700">Presentación <span className="text-error">*</span></label>
          <div className="flex items-center gap-2">
            {puedeGestionar && (
              <>
                <button type="button" onClick={() => { setPresentacionEditando(null); setMostrarFormulario(true); }} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"><PlusCircle className="h-3.5 w-3.5" />Nueva presentación</button>
                <button type="button" onClick={() => { if (presentacionSeleccionada) { setPresentacionEditando(presentacionSeleccionada); setMostrarFormulario(true); } }} disabled={!presentacionSeleccionada} className="rounded-md p-1 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Editar presentación seleccionada" title="Editar presentación seleccionada"><Pencil className="h-3.5 w-3.5" /></button>
              </>
            )}
            {puedeEliminar && <button type="button" onClick={() => { if (presentacionSeleccionada) { setErrorEliminar(null); setPresentacionAEliminar(presentacionSeleccionada); } }} disabled={!presentacionSeleccionada} className="rounded-md p-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Eliminar presentación seleccionada" title="Eliminar presentación seleccionada"><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
        <div className="relative">
          <select id="id_presentacion" name="id_presentacion" value={presentacionSeleccionada?.id_presentacion || ''} onChange={onChange} required disabled={cargandoDatos} className="w-full appearance-none rounded-xl border border-slate-300 px-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-100 disabled:text-slate-400">
            <option value="">Seleccionar...</option>
            {(presentaciones || []).map((presentacion) => <option key={presentacion.id_presentacion} value={presentacion.id_presentacion}>{presentacion.nombre}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500">Cada presentación se registra como un producto independiente, con su propio stock.</p>
      </div>
      <PresentacionQuickCreateModal isOpen={mostrarFormulario} guardando={procesando} presentacion={presentacionEditando} onClose={() => { if (!procesando) { setMostrarFormulario(false); setPresentacionEditando(null); } }} onGuardar={guardar} />
      <PresentacionDeleteModal isOpen={Boolean(presentacionAEliminar)} presentacion={presentacionAEliminar} productosAsociados={Number(presentacionAEliminar?.productos_asociados || 0)} eliminando={procesando} error={errorEliminar} onClose={() => { if (!procesando) { setPresentacionAEliminar(null); setErrorEliminar(null); } }} onConfirm={confirmarEliminar} />
    </>
  );
}
