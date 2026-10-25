import React from 'react';
import { BadgePercent } from 'lucide-react';
import { Modal, ModalActions, ModalHeader } from '../../ui/Modal';

const campoClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-500';

export default function PromocionFormModal({
  isOpen,
  modoEdicion,
  producto,
  sucursales,
  formulario,
  guardando,
  cargandoPrecioReferencia,
  precioReferencia,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <Modal isOpen={isOpen} size="md" labelledBy="titulo-promocion">
      <ModalHeader
        title={modoEdicion ? 'Editar promoción' : 'Nueva promoción'}
        titleId="titulo-promocion"
        subtitle={producto?.nombre_comercial}
        icon={<BadgePercent className="h-5 w-5" />}
        onClose={onClose}
        disabled={guardando}
      />

      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div>
          <label htmlFor="promocion-sucursal" className="text-sm font-bold text-slate-700">
            Sucursal
          </label>
          <select
            id="promocion-sucursal"
            name="id_sucursal"
            value={formulario.id_sucursal}
            onChange={onChange}
            disabled={guardando || modoEdicion}
            required
            className={`mt-1 ${campoClass}`}
          >
            <option value="">Selecciona una sucursal</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                {sucursal.nombre_sucursal}
              </option>
            ))}
          </select>
          {modoEdicion && (
            <p className="mt-1 text-xs text-slate-400">
              La sucursal no puede cambiarse después de crear la promoción.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="promocion-cantidad" className="text-sm font-bold text-slate-700">
              Cantidad mínima
            </label>
            <input
              id="promocion-cantidad"
              name="cantidad_minima"
              type="number"
              min="1"
              step="1"
              value={formulario.cantidad_minima}
              onChange={onChange}
              disabled={guardando}
              required
              className={`mt-1 ${campoClass}`}
            />
          </div>
          <div>
            <label htmlFor="promocion-precio" className="text-sm font-bold text-slate-700">
              Precio promocional (Q)
            </label>
            <input
              id="promocion-precio"
              name="precio_promocion"
              type="number"
              min="0.01"
              max={precioReferencia === null
                ? undefined
                : Math.max(0.01, precioReferencia - 0.01).toFixed(2)}
              step="0.01"
              value={formulario.precio_promocion}
              onChange={onChange}
              disabled={guardando}
              required
              className={`mt-1 ${campoClass}`}
            />
            <p className={`mt-1 text-xs font-semibold ${
              precioReferencia === null ? 'text-amber-700' : 'text-primary'
            }`}>
              {cargandoPrecioReferencia
                ? 'Consultando el precio normal...'
                : precioReferencia === null
                ? 'No hay lotes vendibles con precio en esta sucursal.'
                : `Debe ser menor que ${new Intl.NumberFormat('es-GT', {
                  style: 'currency', currency: 'GTQ', minimumFractionDigits: 2,
                }).format(precioReferencia)}.`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="promocion-inicio" className="text-sm font-bold text-slate-700">
              Fecha de inicio
            </label>
            <input
              id="promocion-inicio"
              name="fecha_inicio"
              type="date"
              value={formulario.fecha_inicio}
              onChange={onChange}
              disabled={guardando}
              required
              className={`mt-1 ${campoClass}`}
            />
          </div>
          <div>
            <label htmlFor="promocion-fin" className="text-sm font-bold text-slate-700">
              Fecha de finalización
            </label>
            <input
              id="promocion-fin"
              name="fecha_fin"
              type="date"
              value={formulario.fecha_fin}
              onChange={onChange}
              disabled={guardando}
              required
              className={`mt-1 ${campoClass}`}
            />
          </div>
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}

        <ModalActions>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || cargandoPrecioReferencia || precioReferencia === null}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Crear promoción'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
