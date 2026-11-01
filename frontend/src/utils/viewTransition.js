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

  return document.startViewTransition(() => {
    flushSync(actualizar);
  });
};

export const navegarConTransicionDeVista = ({
  event,
  navigate,
  destino,
  rutaActual,
}) => {
  const esClicPrincipal = event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;

  if (
    event.defaultPrevented
    || !esClicPrincipal
    || rutaActual === destino
    || !puedeUsarTransicionesDeVista()
  ) return false;

  event.preventDefault();
  ejecutarTransicionDeVista(() => navigate(destino));
  return true;
};
