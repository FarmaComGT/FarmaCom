import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import useAvisoCambiosCaja from './useAvisoCambiosCaja';
import { instalarAvisoCambiosResumen } from './useAvisoCambiosResumen';

instalarAvisoCambiosResumen();
afterEach(() => vi.restoreAllMocks());
function Formulario() {
  const navigate = useNavigate();
  useAvisoCambiosCaja(true);
  return <><input aria-label="Monto pendiente" defaultValue="250" />
    <Link to="/caja/historial">Historial</Link>
    <button onClick={() => navigate('/caja/historial')}>Abrir historial</button>
    <button onClick={() => navigate('/caja/historial', { replace: true })}>Reemplazar ruta</button>
  </>;
}
function montar() {
  window.history.replaceState({ idx: 0 }, '', '/dashboard');
  window.history.pushState({ idx: 1 }, '', '/caja');
  render(<BrowserRouter><Routes><Route path="/caja" element={<Formulario />} />
    <Route path="*" element={<p>Fuera de caja</p>} /></Routes></BrowserRouter>);
}
it.each(['Historial', 'Abrir historial', 'Reemplazar ruta'])('cancelar %s conserva el formulario y no duplica avisos', nombre => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  montar();
  fireEvent.click(screen.getByText(nombre));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Monto pendiente')).toHaveValue('250');
  expect(window.location.pathname).toBe('/caja');
});
it('permite salir al confirmar', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  montar();
  fireEvent.click(screen.getByText('Abrir historial'));
  expect(screen.getByText('Fuera de caja')).toBeVisible();
});
it('restaura la entrada al cancelar Atrás del navegador', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  montar();
  window.history.back();
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  await waitFor(() => expect(window.location.pathname).toBe('/caja'));
  expect(screen.getByLabelText('Monto pendiente')).toHaveValue('250');
});
