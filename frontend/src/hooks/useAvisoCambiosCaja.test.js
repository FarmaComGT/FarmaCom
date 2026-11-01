import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useAvisoCambiosCaja from './useAvisoCambiosCaja';

afterEach(() => { vi.restoreAllMocks(); document.querySelectorAll('[data-prueba-caja]').forEach(e => e.remove()); });

function enlace(destino, opciones = {}) {
  const elemento = document.createElement('a');
  elemento.href = destino;
  elemento.dataset.pruebaCaja = '';
  if (opciones.target) elemento.target = opciones.target;
  document.body.append(elemento);
  // Evita navegar realmente en jsdom; permite observar la cancelación previa del hook.
  let cancelado;
  elemento.addEventListener('click', evento => { cancelado = evento.defaultPrevented; evento.preventDefault(); });
  const evento = new MouseEvent('click', { bubbles: true, cancelable: true, ...opciones });
  elemento.dispatchEvent(evento);
  return { evento, cancelado };
}

describe('useAvisoCambiosCaja', () => {
  it('avisa al salir con cambios y retira el aviso al guardar', () => {
    const { rerender, unmount } = renderHook(({ cambios }) => useAvisoCambiosCaja(cambios), { initialProps: { cambios: true } });
    const salida = new Event('beforeunload', { cancelable: true });
    fireEvent(window, salida);
    expect(salida.defaultPrevented).toBe(true);
    rerender({ cambios: false });
    const guardado = new Event('beforeunload', { cancelable: true });
    fireEvent(window, guardado);
    expect(guardado.defaultPrevented).toBe(false);
    unmount();
  });

  it.each([true, false])('respeta la decisión de descartar: %s', aceptar => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(aceptar);
    renderHook(() => useAvisoCambiosCaja(true));
    const { evento, cancelado } = enlace('/caja/historial');
    expect(confirmar).toHaveBeenCalledOnce();
    if (aceptar) expect(cancelado).toBe(false);
    else expect(evento.defaultPrevented).toBe(true);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { target: '_blank' }])('no interrumpe la apertura en otra pestaña: %j', opciones => {
    const confirmar = vi.spyOn(window, 'confirm');
    renderHook(() => useAvisoCambiosCaja(true));
    enlace('/caja/historial', opciones);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('permite enlaces dentro de la misma vista y controles que no navegan', () => {
    const confirmar = vi.spyOn(window, 'confirm');
    renderHook(() => useAvisoCambiosCaja(true));
    enlace(`${window.location.pathname}${window.location.search}#contenido`);
    fireEvent.click(document.body);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('limpia los eventos al desmontar el formulario', () => {
    const confirmar = vi.spyOn(window, 'confirm');
    const { unmount } = renderHook(() => useAvisoCambiosCaja(true));
    unmount();
    enlace('/caja/administracion');
    expect(confirmar).not.toHaveBeenCalled();
    const salida = new Event('beforeunload', { cancelable: true });
    fireEvent(window, salida);
    expect(salida.defaultPrevented).toBe(false);
  });
});
