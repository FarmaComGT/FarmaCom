import React from 'react';
import { Pencil, ToggleLeft, ToggleRight, Trash2, Phone } from 'lucide-react';

export default function ProveedorTableRow({
  proveedor,
  onEditar,
  onCambiarEstado,
  onContactos,
  onEliminar,
  procesando,
}) {
  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center bg-white/60">
      <span className="col-span-1 text-sm text-slate-400 font-mono">{proveedor.id_proveedor}</span>
      <span className="col-span-5 font-semibold text-primary">{proveedor.nombre}</span>
      <div className="col-span-2 flex justify-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
          proveedor.activo
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-red-100 text-red-700 border-red-200'
        }`}>
          {proveedor.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div className="col-span-4 flex justify-center gap-2">
        <button
          onClick={() => onContactos(proveedor)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-teal-700 border border-teal-200 hover:bg-teal-50"
        >
          <Phone className="w-3.5 h-3.5" />
          Contactos
        </button>
        <button
          onClick={() => onEditar(proveedor)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </button>
        <button
          onClick={() => onCambiarEstado(proveedor)}
          disabled={procesando}
          className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-60 ${
            proveedor.activo
              ? 'text-red-600 border-red-200 hover:bg-red-50'
              : 'text-green-700 border-green-200 hover:bg-green-50'
          }`}
        >
          {proveedor.activo
            ? <><ToggleLeft className="w-3.5 h-3.5" /> Desactivar</>
            : <><ToggleRight className="w-3.5 h-3.5" /> Activar</>}
        </button>
        <button
          type="button"
          onClick={() => onEliminar(proveedor)}
          disabled={procesando}
          aria-label={`Eliminar proveedor ${proveedor.nombre}`}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
