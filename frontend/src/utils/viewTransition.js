import { flushSync } from 'react-dom';

const prefiereMovimientoReducido = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const puedeUsarTransicionesDeVista = () => (
  typeof document !== 'undefined'
  && typeof document.startViewTransition === 'function'
  && !prefiereMovimientoReducido()
);

export const ejecutarTransicionDeVista = (actualizar) => {
  if (!puedeUsarTransicionesDeVista()) {
    actualizar();
    return null;
  }

  return document.startViewTransition(() => { flushSync(actualizar); });
};

export const navegarConTransicionDeVista = ({
  event,
  navigate,
  destino,
  rutaActual,
}) => {
  // Los cambios de destino son inmediatos; las transiciones se reservan
  // para selecciones locales mediante ejecutarTransicionDeVista.
  return false;
};
