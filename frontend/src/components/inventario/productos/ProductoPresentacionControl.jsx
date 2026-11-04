import { useToast } from '../../../context/ToastContext.jsx';
import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import PresentacionDeleteModal from './PresentacionDeleteModal.jsx';
import PresentacionQuickCreateModal from './PresentacionQuickCreateModal.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProductoPresentacionControl({
  isOpen, presentaciones, presentacionSeleccionada, cargandoDatos,
  puedeGestionar, puedeEliminar, onChange, onSeleccionar, onCrear,
  onActualizar, onEliminar,
}) {
  const toast = useToast();
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
      toast.success('Presentación eliminada correctamente.');
      onSeleccionar(null);
      setPresentacionAEliminar(null);
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'No se pudo eliminar la presentación.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <section className={styles.section} aria-labelledby="producto-presentacion-title">
        <div className={styles.inlineActions}>
          <h3 id="producto-presentacion-title" className={styles.sectionHeading}>Presentación</h3>
          {puedeGestionar && (
            <button type="button" onClick={() => { setPresentacionEditando(null); setMostrarFormulario(true); }} className={`${styles.button} ${styles.compactButton}`}>
              <Plus size={14} aria-hidden="true" /> Nueva presentación…
            </button>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="id_presentacion">Presentación del producto</label>
          <select id="id_presentacion" name="id_presentacion" value={presentacionSeleccionada?.id_presentacion || ''} onChange={onChange} required disabled={cargandoDatos} className={styles.input}>
            <option value="">{cargandoDatos ? 'Cargando presentaciones…' : 'Selecciona una presentación'}</option>
            {(presentaciones || []).map((presentacion) => <option key={presentacion.id_presentacion} value={presentacion.id_presentacion}>{presentacion.nombre}</option>)}
          </select>
          <p className={styles.helpText}>Cada presentación se administra como un producto independiente con su propio stock.</p>
        </div>
        {(puedeGestionar || puedeEliminar) && (
          <div className={styles.inlineActions}>
            {puedeGestionar && (
              <button type="button" onClick={() => { if (presentacionSeleccionada) { setPresentacionEditando(presentacionSeleccionada); setMostrarFormulario(true); } }} disabled={!presentacionSeleccionada} className={`${styles.button} ${styles.compactButton}`} aria-label="Editar presentación seleccionada">
                <Pencil size={14} aria-hidden="true" /> Editar…
              </button>
            )}
            {puedeEliminar && (
              <button type="button" onClick={() => { if (presentacionSeleccionada) { setErrorEliminar(null); setPresentacionAEliminar(presentacionSeleccionada); } }} disabled={!presentacionSeleccionada} className={`${styles.button} ${styles.compactButton} ${styles.danger}`} aria-label="Eliminar presentación seleccionada">
                <Trash2 size={14} aria-hidden="true" /> Eliminar…
              </button>
            )}
          </div>
        )}
      </section>

      <PresentacionQuickCreateModal isOpen={mostrarFormulario} guardando={procesando} presentacion={presentacionEditando} onClose={() => { if (!procesando) { setMostrarFormulario(false); setPresentacionEditando(null); } }} onGuardar={guardar} />
      <PresentacionDeleteModal isOpen={Boolean(presentacionAEliminar)} presentacion={presentacionAEliminar} productosAsociados={Number(presentacionAEliminar?.productos_asociados || 0)} eliminando={procesando} error={errorEliminar} onClose={() => { if (!procesando) { setPresentacionAEliminar(null); setErrorEliminar(null); } }} onConfirm={confirmarEliminar} />
    </>
  );
}
