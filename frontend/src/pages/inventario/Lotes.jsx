import React from 'react';
import { Layers } from 'lucide-react';

export default function Lotes() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Layers className="w-12 h-12 text-slate-300" />
        <p className="font-headline text-2xl font-bold">Lotes</p>
        <p className="text-sm">Esta pantalla está en construcción.</p>
      </div>
    </div>
  );
}