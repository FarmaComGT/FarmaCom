import React from 'react';
import { Pill } from 'lucide-react';

export default function BrandLogo({ compact = false, subtitle = 'Gestion farmaceutica', centered = false }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-[0_10px_24px_rgba(0,81,71,0.18)]">
        <Pill className="h-5 w-5 text-white" />
      </div>

      <div className={compact ? '' : centered ? 'text-center' : 'text-left'}>
        <p translate="no" className="font-headline text-2xl font-extrabold tracking-tight text-primary">
          FarmaCom
        </p>
        {!compact && (
          <p className="text-xs font-medium tracking-[0.16em] text-primary/55 uppercase">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
