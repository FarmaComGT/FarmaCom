import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../api/axios';
import PromocionProductoPicker from './PromocionProductoPicker';

vi.mock('../../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../ui/EscanerCamaraModal', () => ({ default: ({ onCodigo, onClose }) => <div role="dialog" aria-label="Cámara de prueba"><button type="button" onClick={() => onCodigo('000123')}>Simular lectura</button><button type="button" onClick={onClose}>Cerrar cámara</button></div> }));
vi.mock('../../ui/LectorMovilButton', () => ({ default: ({ onCodigo, bloqueado, destino }) => <button type="button" disabled={bloqueado} data-destino={destino} onClick={() => onCodigo('000123')}>Usar celular</button> }));
const producto = { id_producto: 4, codigo: 'MED-004', codigo_barras: '000123', nombre_comercial: 'Oxímetro', presentacion: 'Unidad' };
function Formulario({ seleccionar, submit, bloqueado = false }) {
  const [actual, setActual] = useState(null);
  return <form onSubmit={(e) => { e.preventDefault(); submit?.(); }}><PromocionProductoPicker producto={actual} bloqueado={bloqueado} onSeleccionar={(p) => { seleccionar?.(p); setActual(p); }} /><button type="submit">Guardar promoción</button></form>;
}

describe('escaneo en promociones', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.get.mockImplementation(async (url) => ({ data: url.endsWith('/lectura') ? producto : [producto] }));
  });
  it('el Enter USB selecciona por código exacto sin enviar el formulario', async () => {
    const usuario = userEvent.setup(); const submit = vi.fn(); const seleccionar = vi.fn();
    render(<Formulario submit={submit} seleccionar={seleccionar} />);
    await usuario.type(screen.getByRole('searchbox'), '000123{Enter}');
    await screen.findByText('Oxímetro');
    expect(api.get).toHaveBeenCalledWith('/productos/seleccion/lectura', { params: { codigo: '000123' }, signal: expect.any(AbortSignal) });
    expect(seleccionar).toHaveBeenCalledWith(producto);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('Código de barras: 000123')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cambiar producto' })).toHaveFocus());
  });
  it('una lectura no registrada muestra recuperación sin elegir una coincidencia aproximada', async () => {
    api.get.mockImplementation(async (url) => { if (url.endsWith('/lectura')) throw { response: { data: { mensaje: 'Código no registrado.' } } }; return { data: [producto] }; });
    const usuario = userEvent.setup(); const seleccionar = vi.fn();
    render(<Formulario seleccionar={seleccionar} />);
    await usuario.type(screen.getByRole('searchbox'), '000999{Enter}');
    expect(await screen.findByText('Código no registrado.')).toBeInTheDocument();
    expect(seleccionar).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toHaveValue('000999');
  });
  it('reutiliza la cámara para seleccionar y cierra el escáner al leer', async () => {
    const usuario = userEvent.setup(); const submit = vi.fn();
    render(<Formulario submit={submit} />);
    await usuario.click(screen.getByRole('button', { name: /con cámara/ }));
    await usuario.click(screen.getByRole('button', { name: 'Simular lectura' }));
    await screen.findByText('Código de barras: 000123');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
  it('recibe el código del celular en su propio destino y permite cambiar el producto', async () => {
    const usuario = userEvent.setup(); render(<Formulario />);
    expect(screen.getByRole('button', { name: 'Usar celular' })).toHaveAttribute('data-destino', 'promocion');
    await usuario.click(screen.getByRole('button', { name: 'Usar celular' }));
    await screen.findByText('Código de barras: 000123');
    await usuario.click(screen.getByRole('button', { name: 'Cambiar producto' }));
    await waitFor(() => expect(screen.getByRole('searchbox')).toHaveFocus());
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
  it('descarta una lectura pendiente si el usuario cambia la búsqueda', async () => {
    let resolver;
    api.get.mockImplementation((url) => url.endsWith('/lectura') ? new Promise((resolve) => { resolver = resolve; }) : Promise.resolve({ data: [] }));
    const usuario = userEvent.setup(); const seleccionar = vi.fn(); render(<Formulario seleccionar={seleccionar} />);
    await usuario.type(screen.getByRole('searchbox'), '000123{Enter}');
    await usuario.clear(screen.getByRole('searchbox'));
    await usuario.type(screen.getByRole('searchbox'), 'Otro producto');
    await act(async () => resolver({ data: producto }));
    expect(seleccionar).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toHaveValue('Otro producto');
  });
});
