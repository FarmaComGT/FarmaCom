export const abrirSelectorFecha = (referencia) => {
  if (typeof referencia.current?.showPicker !== 'function') return;

  try {
    referencia.current.showPicker();
  } catch {
    // Algunos navegadores bloquean showPicker fuera de una interacción directa.
  }
};
