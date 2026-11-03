import React, { useEffect, useMemo, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import useProductoForm, { inicializarProductoForm } from '../../../hooks/useProductoForm.js';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from '../../../hooks/useAvisoCambiosSinGuardar.js';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import ProductoClasificacion from './ProductoClasificacion.jsx';
import ProductoDatosGenerales from './ProductoDatosGenerales.jsx';
import ProductoInventarioConfig from './ProductoInventarioConfig.jsx';
import ProductoPresentacionControl from './ProductoPresentacionControl.jsx';
import styles from '../../../styles/ManagementUI.module.css';

const campoParaError = (error) => {
  const campos = [
    ['nombre comercial', 'nombre_comercial'],
    ['nombre genérico', 'nombre_generico'],
    ['presentación', 'id_presentacion'],
    ['categoría', 'id_categoria'],
    ['casa farmacéutica', 'id_casa'],
    ['precio de compra', 'precio_compra'],
    ['stock mínimo', 'stock_minimo'],
    ['meses de alerta', 'meses_alerta_vencimiento'],
  ];
  return campos.find(([texto]) => error?.toLocaleLowerCase('es').includes(texto))?.[1];
};

export default function ProductoFormModal({
  isOpen, modoEdicion, producto, codigoSugerido, categorias, casas, proveedores,
  presentaciones, cargandoDatos, guardando, errorFormulario, onClose, onSubmit,
  onCrearPresentacion, onActualizarPresentacion, onEliminarPresentacion,
  puedeGestionarPresentaciones = true, puedeEliminarPresentaciones = true,
}) {
  const {
    formulario, codigoMostrado, presentacionSeleccionada, errorValidacion,
    manejarCambio, manejarToggleActivo, manejarEnvio, seleccionarPresentacion,
  } = useProductoForm({ isOpen, modoEdicion, producto, codigoSugerido, presentaciones, onSubmit });
  const errorRef = useRef(null);
  const formularioInicial = useMemo(
    () => inicializarProductoForm(modoEdicion ? producto : null),
    [modoEdicion, producto],
  );
  const hayCambios = isOpen && JSON.stringify(formulario) !== JSON.stringify(formularioInicial);
  useAvisoCambiosSinGuardar(hayCambios && !guardando);

  useEffect(() => {
    const error = errorValidacion || errorFormulario;
    if (!error) return;
    const campo = campoParaError(error);
    if (campo) document.getElementById(campo)?.focus();
    else errorRef.current?.focus();
  }, [errorFormulario, errorValidacion]);

  const solicitarCierre = () => {
    if (guardando) return;
    if (!hayCambios || confirmarDescartarCambios()) onClose();
  };
  const tituloId = 'titulo-formulario-producto';
  const etiquetaGuardar = modoEdicion ? 'Guardar cambios' : 'Guardar producto';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={solicitarCierre} busy={guardando} size="large">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar producto' : 'Nuevo producto'}</h2>
            <p>{modoEdicion ? 'Actualiza la información del catálogo sin alterar sus lotes.' : 'Agrega un producto al catálogo; después podrás ingresar existencias por lote.'}</p>
          </div>
          <button type="button" onClick={solicitarCierre} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={manejarEnvio} noValidate className={styles.form}>
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

          {(errorValidacion || errorFormulario) && (
            <p ref={errorRef} tabIndex={-1} role="alert" className={styles.fieldError}>{errorValidacion || errorFormulario}</p>
          )}

          <div className={styles.dialogActions}>
            <button type="button" onClick={solicitarCierre} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando || cargandoDatos} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {etiquetaGuardar}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
