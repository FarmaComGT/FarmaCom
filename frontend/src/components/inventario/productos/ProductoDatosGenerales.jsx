import React from 'react';

export default function ProductoDatosGenerales({
  formulario,
  codigoMostrado,
  onChange,
  onToggleActivo,
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Código</label>
          <input type="text" value={codigoMostrado} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Estado</label>
          <div className="flex items-center gap-3 h-[42px]">
            <button type="button" role="switch" aria-checked={formulario.activo} onClick={onToggleActivo} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30 ${formulario.activo ? 'bg-primary' : 'bg-slate-300'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formulario.activo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-slate-700">{formulario.activo ? 'Activo' : 'Inactivo'}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Nombre comercial <span className="text-error">*</span></label>
        <input type="text" name="nombre_comercial" value={formulario.nombre_comercial} onChange={onChange} placeholder="Ej. Aspirina Forte" maxLength={150} required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Nombre genérico <span className="text-error">*</span></label>
          <input type="text" name="nombre_generico" value={formulario.nombre_generico} onChange={onChange} placeholder="Ej. Ácido Acetilsalicílico" maxLength={150} required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
        <div className="space-y-1">
          <label htmlFor="concentracion" className="text-sm font-semibold text-slate-700">Concentración <span className="font-normal text-slate-500">(opcional)</span></label>
          <input id="concentracion" type="text" name="concentracion" value={formulario.concentracion} onChange={onChange} placeholder="Ej. 500 mg" maxLength={50} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
      </div>
    </>
  );
}
