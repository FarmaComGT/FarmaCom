import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LectorMovilProvider } from './LectorMovilContext';
import LectorMovilButton, { LectorMovilEstado } from '../components/ui/LectorMovilButton';
import { crearVinculacion, pulsoVinculacion, confirmarVinculacion, revocarVinculacion, acusarLectura } from '../api/lectorMovil';

vi.mock('../api/lectorMovil', () => ({ crearVinculacion: vi.fn(), pulsoVinculacion: vi.fn(), confirmarVinculacion: vi.fn(), revocarVinculacion: vi.fn(), acusarLectura: vi.fn() }));
const base = { id: 'sesion', confirmado: true, conectado: true, inactividadMinutos: 15, limiteJornada: Date.now() + 3600000 };

function Pantallas({ ventas, producto }) {
  const [pantalla, setPantalla] = useState('ventas');
  return <>
    <LectorMovilEstado />
    <button onClick={() => setPantalla('ventas')}>Ir a ventas</button>
    <button onClick={() => setPantalla('inventario')}>Ir a inventario</button>
    <button onClick={() => setPantalla('producto')}>Abrir producto</button>
    <input aria-label="Dato conservado" defaultValue="borrador" />
    {pantalla === 'ventas' && <LectorMovilButton key="ventas" destino="ventas" contexto="carrito" onCodigo={ventas} />}
    {pantalla === 'producto' && <LectorMovilButton key="producto" destino="producto" contexto="producto" onCodigo={producto} />}
  </>;
}

describe('conexión compartida entre pantallas', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    crearVinculacion.mockResolvedValue(base);
    pulsoVinculacion.mockImplementation(async (_id, _disponible, _signal, contexto, destino) => ({ ...base, contexto, destino }));
    confirmarVinculacion.mockResolvedValue(base);
    revocarVinculacion.mockResolvedValue(); acusarLectura.mockResolvedValue();
  });

  it('conserva una sola vinculación al pasar de ventas a inventario y abrir un producto', async () => {
    const usuario = userEvent.setup();
    render(<LectorMovilProvider><Pantallas ventas={vi.fn()} producto={vi.fn()} /></LectorMovilProvider>);
    await usuario.click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    // El mock representa una conexión ya confirmada; cerrar solo el diálogo.
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar vinculación' }));
    await usuario.click(screen.getByText('Ir a inventario'));
    expect(await screen.findByRole('button', { name: /Administrar lector conectado. Celular: En pausa/ })).toBeInTheDocument();
    await waitFor(() => expect(pulsoVinculacion.mock.calls.some(([, disponible, , , destino]) => !disponible && destino === 'pausa')).toBe(true), { timeout: 2500 });
    await usuario.click(screen.getByText('Abrir producto'));
    expect(await screen.findByRole('button', { name: 'Administrar celular conectado' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Administrar celular conectado' }));
    expect(crearVinculacion).toHaveBeenCalledTimes(1);
    expect(revocarVinculacion).not.toHaveBeenCalled();
  });

  it('descarta una respuesta tardía de ventas y entrega únicamente la lectura nueva al producto', async () => {
    let resolver;
    pulsoVinculacion.mockImplementationOnce((_id, _disponible, _signal, contexto) => new Promise((resolve) => { resolver = () => resolve({ ...base, contexto, destino: 'ventas', lectura: { id: 'vieja', codigo: 'VENTAS' } }); }));
    const ventas = vi.fn(); const producto = vi.fn(); const usuario = userEvent.setup();
    render(<LectorMovilProvider><Pantallas ventas={ventas} producto={producto} /></LectorMovilProvider>);
    await usuario.click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    await waitFor(() => expect(resolver).toBeTypeOf('function'));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar vinculación' }));
    await usuario.click(screen.getByText('Abrir producto'));
    pulsoVinculacion.mockImplementation(async (_id, _disponible, _signal, contexto, destino) => ({ ...base, contexto, destino, lectura: { id: 'nueva', codigo: 'PRODUCTO' } }));
    await act(async () => resolver());
    await waitFor(() => expect(producto).toHaveBeenCalledExactlyOnceWith('PRODUCTO'), { timeout: 2500 });
    expect(ventas).not.toHaveBeenCalled();
    expect(acusarLectura).toHaveBeenCalledWith('sesion', 'nueva');
    expect(acusarLectura).not.toHaveBeenCalledWith('sesion', 'vieja');
  });

  it('revoca al cambiar identidad sin desmontar los formularios de la aplicación', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<LectorMovilProvider identidad="usuario:1:sucursal:1"><Pantallas ventas={vi.fn()} producto={vi.fn()} /></LectorMovilProvider>);
    await usuario.click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar vinculación' }));
    const campo = screen.getByRole('textbox', { name: 'Dato conservado' });
    await usuario.type(campo, ' pendiente');
    rerender(<LectorMovilProvider identidad="usuario:1:sucursal:2"><Pantallas ventas={vi.fn()} producto={vi.fn()} /></LectorMovilProvider>);
    expect(revocarVinculacion).toHaveBeenCalledWith('sesion');
    expect(screen.getByRole('textbox', { name: 'Dato conservado' })).toBe(campo);
    expect(campo).toHaveValue('borrador pendiente');
    expect(screen.getByRole('button', { name: 'Usar celular como lector' })).toBeInTheDocument();
  });
});
