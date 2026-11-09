import React, { useEffect, useMemo, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import useLoteForm, { fechaManana, inicializarLoteForm } from '../../../hooks/useLoteForm.js';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from '../../../hooks/useAvisoCambiosSinGuardar.js';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import LoteDatosSection from './LoteDatosSection.jsx';
import LotePreciosSection from './LotePreciosSection.jsx';
import styles from '../../../styles/ManagementUI.module.css';

const campoParaError = (error) => {
  const campos = [
    ['producto', 'producto_lote'], ['proveedor', 'id_proveedor_lote'],
    ['sucursal', 'id_sucursal_lote'], ['número de lote', 'numero_lote'],
    ['fecha de vencimiento', 'fecha_vencimiento_lote'],
    ['cantidad ingresada', 'cantidad_ingresada_lote'],
    ['precio de compra', 'precio_compra_lote'], ['precio de venta', 'precio_venta_lote'],
    ['margen', 'margen_ganancia_lote'],
  ];
  return campos.find(([texto]) => error?.toLocaleLowerCase('es').includes(texto))?.[1];
};

export default function LoteFormModal({
  isOpen, productos, proveedores, sucursales, sucursalInicialId, productoInicialId,
  bloquearProducto = false, lote = null, cargandoDatos, guardando = false,
  errorFormulario = null, onClose, onSubmit,
}) {
  const {
    formulario, errorLocal, modoEdicion, productosActivos, productoSeleccionado,
    manejarCambio, manejarPrecioChange, manejarEnvio,
  } = useLoteForm({ isOpen, productos, productoInicialId, sucursalInicialId, lote, onSubmit });
  const errorRef = useRef(null);
  const formularioInicial = useMemo(() => inicializarLoteForm({
    lote, productoInicialId, sucursalInicialId, productos,
  }), [lote, productoInicialId, productos, sucursalInicialId]);
  const hayCambios = isOpen && JSON.stringify(formulario) !== JSON.stringify(formularioInicial);
  useAvisoCambiosSinGuardar(hayCambios && !guardando);

  useEffect(() => {
    const error = errorLocal || errorFormulario;
    if (!error) return;
    const campo = campoParaError(error);
    if (campo) document.getElementById(campo)?.focus();
    else errorRef.current?.focus();
  }, [errorFormulario, errorLocal]);

  const solicitarCierre = () => {
    if (guardando) return;
    if (!hayCambios || confirmarDescartarCambios()) onClose();
  };
  const tituloId = 'titulo-formulario-lote';
  const etiquetaGuardar = modoEdicion ? 'Guardar cambios' : 'Guardar lote';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={solicitarCierre} busy={guardando} size="large">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar lote' : 'Ingresar lote'}</h2>
            <p>{modoEdicion ? `Actualiza los datos y precios de ${lote?.numero_lote || 'este lote'}.` : 'Registra existencias, vencimiento y precios para una sucursal.'}</p>
          </div>
          <button type="button" onClick={solicitarCierre} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={manejarEnvio} noValidate className={styles.form}>
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

          {(errorLocal || errorFormulario) && (
            <p ref={errorRef} tabIndex={-1} role="alert" className={styles.fieldError}>{errorLocal || errorFormulario}</p>
          )}

          <div className={styles.dialogActions}>
            <button type="button" onClick={solicitarCierre} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={cargandoDatos || guardando} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {etiquetaGuardar}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
