import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import useScrollListado from './useScrollListado';
afterEach(() => vi.restoreAllMocks());
function Listado() {
  const { key } = useLocation();
  useScrollListado(true);
  return <Link to="/detalle" state={{ entradaListado: key }}>Ver detalle</Link>;
}
function Detalle() {
  const { state } = useLocation();
  const navigate = useNavigate();
  return <><Link to="/lista?q=Ana&pagina=2" state={state}>Regresar</Link><button onClick={() => navigate(-1)}>Atrás</button></>;
}
it.each(['Regresar', 'Atrás'])('restaura el desplazamiento al usar %s tras desmontar el listado', accion => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(540);
  render(<MemoryRouter initialEntries={['/lista?q=Ana&pagina=2']}><Routes>
    <Route path="/lista" element={<Listado />} /><Route path="/detalle" element={<Detalle />} />
  </Routes></MemoryRouter>);
  fireEvent.scroll(window);
  fireEvent.click(screen.getByText('Ver detalle'));
  fireEvent.click(screen.getByText(accion));
  expect(scroll).toHaveBeenLastCalledWith(0, 540);
});
