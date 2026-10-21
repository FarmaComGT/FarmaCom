import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';
import MetodoPagoSelector from './MetodoPagoSelector';

export default function CarritoAccionesCobro({ total, metodoPago, deshabilitado, onMetodoPagoChange, onProcesar }) {
  return <footer className="space-y-5 bg-primary/5 p-5 sm:p-6"><div className="flex items-center justify-between gap-4 px-1"><span className="font-headline text-lg font-extrabold text-secondary">Monto total</span><div className="text-right"><p className="font-mono text-3xl font-black tracking-tight text-primary">{formatearQuetzales(total)}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total de la venta</p></div></div><MetodoPagoSelector seleccionado={metodoPago} onSeleccionar={onMetodoPagoChange} /><button type="button" onClick={onProcesar} disabled={deshabilitado} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-container py-4 font-headline text-base font-extrabold text-white shadow-xl shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"><ShoppingCart className="h-5 w-5" />Procesar venta</button></footer>;
}
