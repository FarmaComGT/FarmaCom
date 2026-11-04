import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { ToastProvider, useToast } from './ToastContext.jsx';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const wrapper = ({ children }) => <StrictMode><ToastProvider>{children}</ToastProvider></StrictMode>;

describe('notificaciones globales', () => {
  it('muestra la cuenta regresiva solo si hay cierre automático, incluso para un error con duración personalizada', () => {
    const { result } = renderHook(useToast, { wrapper });
    act(() => {
      result.current.success('Guardado.');
      result.current.error('Fallo persistente.', { duracion: 0 });
      result.current.error('Fallo temporal.', { duracion: 8000 });
    });
    const temporizador = (texto) => screen.getByText(texto).closest('li').querySelector('[data-toast-timer]');
    expect(temporizador('Guardado.')).toHaveAttribute('aria-hidden', 'true');
    expect(temporizador('Guardado.').firstChild).toHaveStyle({ animationDuration: '5000ms' });
    expect(temporizador('Fallo persistente.')).toBeNull();
    expect(temporizador('Fallo temporal.').firstChild).toHaveStyle({ animationDuration: '8000ms' });
  });

  it('anuncia las cuatro variantes sin mover el foco', () => {
    const { result } = renderHook(useToast, { wrapper });
    const entrada = document.createElement('input');
    document.body.append(entrada);
    entrada.focus();
    act(() => { result.current.success('Categoría guardada.'); result.current.error('Falló la operación.'); result.current.warning('Revisa los datos.'); });
    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect(screen.getByText('Éxito')).toBeInTheDocument();
    expect(document.activeElement).toBe(entrada);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación: Revisa los datos.' }));
    act(() => result.current.info('Nueva información.'));
    expect(screen.getByText('Información')).toBeInTheDocument();
    entrada.remove();
  });

  it('cierra éxitos a los 5 segundos y errores a los 10 segundos con su barra', () => {
    vi.useFakeTimers();
    const { result } = renderHook(useToast, { wrapper });
    act(() => { result.current.success('Guardado.'); result.current.error('No se pudo guardar.'); });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument();
    expect(screen.getByText('No se pudo guardar.')).toBeInTheDocument();
    const barra = screen.getByText('No se pudo guardar.').closest('li').querySelector('[data-toast-timer] span');
    expect(barra).toHaveStyle({ animationDuration: '10000ms' });
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText('No se pudo guardar.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('No se pudo guardar.')).not.toBeInTheDocument();
  });

  it('conserva las advertencias y los errores con duración cero hasta su cierre manual', () => {
    vi.useFakeTimers();
    const { result } = renderHook(useToast, { wrapper });
    act(() => {
      result.current.error('Requiere verificación.', { duracion: 0 });
      result.current.warning('Revisa los datos.');
    });
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText('Requiere verificación.')).toBeInTheDocument();
    expect(screen.getByText('Revisa los datos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación: Requiere verificación.' }));
    expect(screen.queryByText('Requiere verificación.')).not.toBeInTheDocument();
  });

  it('pausa el tiempo al apuntar o enfocar y lo reanuda al salir', () => {
    vi.useFakeTimers();
    const { result } = renderHook(useToast, { wrapper });
    act(() => result.current.success('Guardado.'));
    const item = screen.getByText('Guardado.').closest('li');
    const barra = item.querySelector('[data-toast-timer] span');
    fireEvent.pointerEnter(item);
    expect(barra).toHaveStyle({ animationPlayState: 'paused' });
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('Guardado.')).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: /Cerrar notificación/ });
    act(() => boton.focus());
    fireEvent.pointerLeave(item);
    expect(barra).toHaveStyle({ animationPlayState: 'paused' });
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('Guardado.')).toBeInTheDocument();
    act(() => boton.blur());
    expect(barra).toHaveStyle({ animationPlayState: 'running' });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument();
  });

  it('limita a tres visibles y empieza el tiempo del siguiente cuando aparece', () => {
    vi.useFakeTimers();
    const { result } = renderHook(useToast, { wrapper });
    act(() => {
      ['Uno', 'Dos', 'Tres'].forEach((texto) => result.current.error(texto, { duracion: 0 }));
      result.current.success('Cuatro');
    });
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.queryByText('Cuatro')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación: Uno' }));
    expect(screen.getByText('Cuatro')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText('Cuatro')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Cuatro')).not.toBeInTheDocument();
  });

  it('pausa mientras la pestaña está oculta', () => {
    vi.useFakeTimers();
    const { result } = renderHook(useToast, { wrapper });
    act(() => result.current.info('Consulta disponible.'));
    const visibilidad = vi.spyOn(document, 'hidden', 'get');
    try {
      visibilidad.mockReturnValue(true);
      fireEvent(document, new Event('visibilitychange'));
      act(() => vi.advanceTimersByTime(15000));
      expect(screen.getByText('Consulta disponible.')).toBeInTheDocument();
      visibilidad.mockReturnValue(false);
      fireEvent(document, new Event('visibilitychange'));
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.queryByText('Consulta disponible.')).not.toBeInTheDocument();
    } finally { visibilidad.mockRestore(); }
  });

  it('ignora textos vacíos, evita duplicados y permite cierre por identificador', () => {
    const { result } = renderHook(useToast, { wrapper });
    let id;
    act(() => {
      result.current.error('  ');
      id = result.current.error(' Falló. ');
      expect(result.current.error('Falló.')).toBe(id);
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    act(() => result.current.cerrar(id));
    expect(screen.queryByText('Falló.')).not.toBeInTheDocument();
  });

  it('ofrece acceso F8 y devuelve el foco con Escape', () => {
    const { result } = renderHook(useToast, { wrapper });
    const entrada = document.createElement('input');
    document.body.append(entrada);
    entrada.focus();
    act(() => result.current.error('Falló.'));
    fireEvent.keyDown(document, { key: 'F8' });
    expect(screen.getByRole('button', { name: /Cerrar notificación/ })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(entrada).toHaveFocus();
    entrada.remove();
  });

  it('conserva los mensajes al cambiar de ruta', () => {
    function Inicio() {
      const toast = useToast();
      return <Link to="/destino" onClick={() => toast.success('Guardado antes de navegar.')}>Continuar</Link>;
    }
    render(<ToastProvider><MemoryRouter><Routes><Route path="/" element={<Inicio />} /><Route path="/destino" element={<h1>Destino</h1>} /></Routes></MemoryRouter></ToastProvider>);
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText('Destino')).toBeInTheDocument();
    expect(screen.getByText('Guardado antes de navegar.')).toBeInTheDocument();
  });
});
