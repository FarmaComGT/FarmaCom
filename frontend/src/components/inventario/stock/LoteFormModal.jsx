import React from 'react';
import { PackagePlus, Pencil } from 'lucide-react';
import useLoteForm, { fechaManana } from '../../../hooks/useLoteForm.js';
import { Modal, ModalActions, ModalHeader } from '../../ui/Modal.jsx';
import LoteDatosSection from './LoteDatosSection.jsx';
import LotePreciosSection from './LotePreciosSection.jsx';

export default function LoteFormModal({
  isOpen, productos, proveedores, sucursales, sucursalInicialId, productoInicialId,
  bloquearProducto = false, lote = null, cargandoDatos, guardando = false,
  errorFormulario = null, onClose, onSubmit,
}) {
  const {
    formulario, errorLocal, modoEdicion, productosActivos, productoSeleccionado,
    manejarCambio, manejarPrecioChange, manejarEnvio,
  } = useLoteForm({ isOpen, productos, productoInicialId, sucursalInicialId, lote, onSubmit });

  if (!isOpen || typeof document === 'undefined') return null;

  return (
    <Modal isOpen={isOpen} size="lg" labelledBy="titulo-formulario-lote" limitarAltura>
      <ModalHeader
        title={modoEdicion ? 'Editar lote' : 'Ingresar lote'}
        titleId="titulo-formulario-lote"
        subtitle={modoEdicion ? `Actualiza los datos de ${lote.numero_lote}` : 'Registro manual para el inventario de sucursal'}
        icon={modoEdicion ? <Pencil className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
        onClose={onClose}
        disabled={guardando}
      />
      <form onSubmit={manejarEnvio} className="space-y-5 overflow-y-auto px-6 py-5">
        <LoteDatosSection
          formulario={formulario}
          productos={productosActivos}
          proveedores={proveedores}
          sucursales={sucursales}
          presentacion={productoSeleccionado?.presentacion}
          modoEdicion={modoEdicion}
          bloquearProducto={bloquearProducto}
          cargandoDatos={cargandoDatos}
          fechaMinima={fechaManana()}
          onChange={manejarCambio}
          onPrecioChange={manejarPrecioChange}
        />
        <LotePreciosSection formulario={formulario} onPrecioChange={manejarPrecioChange} />
        {(errorLocal || errorFormulario) && <p className="text-sm font-semibold text-error">{errorLocal || errorFormulario}</p>}
        <ModalActions divided>
          <button type="button" onClick={onClose} disabled={guardando} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={cargandoDatos || guardando} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Guardar lote'}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
