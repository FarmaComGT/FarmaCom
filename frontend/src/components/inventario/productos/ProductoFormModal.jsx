import React from 'react';
import useProductoForm from '../../../hooks/useProductoForm.js';
import { Modal, ModalActions, ModalHeader } from '../../ui/Modal.jsx';
import ProductoClasificacion from './ProductoClasificacion.jsx';
import ProductoDatosGenerales from './ProductoDatosGenerales.jsx';
import ProductoInventarioConfig from './ProductoInventarioConfig.jsx';
import ProductoPresentacionControl from './ProductoPresentacionControl.jsx';

export default function ProductoFormModal({
  isOpen,
  modoEdicion,
  producto,
  codigoSugerido,
  categorias,
  casas,
  proveedores,
  presentaciones,
  cargandoDatos,
  guardando,
  errorFormulario,
  onClose,
  onSubmit,
  onCrearPresentacion,
  onActualizarPresentacion,
  onEliminarPresentacion,
  puedeGestionarPresentaciones = true,
  puedeEliminarPresentaciones = true,
}) {
  const {
    formulario,
    codigoMostrado,
    presentacionSeleccionada,
    errorValidacion,
    manejarCambio,
    manejarToggleActivo,
    manejarEnvio,
    seleccionarPresentacion,
  } = useProductoForm({
    isOpen,
    modoEdicion,
    producto,
    codigoSugerido,
    presentaciones,
    onSubmit,
  });

  if (!isOpen || typeof document === 'undefined') return null;

  return (
    <Modal isOpen={isOpen} size="md" labelledBy="titulo-formulario-producto">
      <ModalHeader
        title={modoEdicion ? 'Editar producto' : 'Nuevo producto'}
        titleId="titulo-formulario-producto"
        onClose={onClose}
        disabled={guardando}
      />

      <form onSubmit={manejarEnvio} className="px-6 py-5 space-y-4">
        <ProductoDatosGenerales formulario={formulario} codigoMostrado={codigoMostrado} onChange={manejarCambio} onToggleActivo={manejarToggleActivo} />
        <ProductoPresentacionControl
          isOpen={isOpen}
          presentaciones={presentaciones}
          presentacionSeleccionada={presentacionSeleccionada}
          cargandoDatos={cargandoDatos}
          puedeGestionar={puedeGestionarPresentaciones}
          puedeEliminar={puedeEliminarPresentaciones}
          onChange={manejarCambio}
          onSeleccionar={seleccionarPresentacion}
          onCrear={onCrearPresentacion}
          onActualizar={onActualizarPresentacion}
          onEliminar={onEliminarPresentacion}
        />
        <ProductoClasificacion formulario={formulario} categorias={categorias} casas={casas} proveedores={proveedores} cargandoDatos={cargandoDatos} onChange={manejarCambio} />
        <ProductoInventarioConfig formulario={formulario} onChange={manejarCambio} />

        {(errorValidacion || errorFormulario) && <p className="text-sm text-error font-semibold">{errorValidacion || errorFormulario}</p>}

        <ModalActions>
          <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={guardando || cargandoDatos} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60">
            {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
