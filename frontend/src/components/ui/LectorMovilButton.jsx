import React, { useLayoutEffect, useRef } from 'react';
import { Smartphone } from 'lucide-react';
import { nombresDestino, useLectorMovil } from '../../context/LectorMovilContext';
import styles from './LectorMovil.module.css';

export default function LectorMovilButton({ destino, contexto, bloqueado, onCodigo, className = '' }) {
  const lector = useLectorMovil();
  const registrar = lector?.registrar;
  const opciones = useRef({ bloqueado, onCodigo });
  opciones.current = { bloqueado, onCodigo };
  useLayoutEffect(() => registrar?.(destino, opciones), [registrar, destino, contexto]);
  const conectado = lector?.sesion?.confirmado;
  return <button type="button" className={`${styles.trigger} ${className}`} disabled={bloqueado || !lector?.habilitado} onClick={lector?.abrir}
    aria-label={conectado ? 'Administrar celular conectado' : 'Usar celular como lector'}>
    <Smartphone size={18} aria-hidden="true" /><span>{conectado ? 'Celular conectado' : 'Usar celular'}</span>
  </button>;
}

export function LectorMovilEstado() {
  const lector = useLectorMovil();
  if (!lector?.sesion?.confirmado) return null;
  const etiqueta = `Celular: ${nombresDestino[lector.destino]}`;
  return <button type="button" className={`${styles.trigger} ${styles.global}`} onClick={lector.abrir} aria-label={`Administrar lector conectado. ${etiqueta}`} title={etiqueta}>
    <Smartphone size={18} aria-hidden="true" /><span>Celular · {({ ventas: 'Ventas', producto: 'Producto', promocion: 'Promoción', pausa: 'En pausa' })[lector.destino]}</span>
  </button>;
}
