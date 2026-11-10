import { ToastProvider } from '../context/ToastContext.jsx';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Clientes from './Clientes';
import { elegirAccion } from '../test/menuAcciones';

const {
  mockObtenerHistorialCompras,
  mockCrearCliente,
  mockActualizarCliente,
  mockApi,
} = vi.hoisted(() => ({
  mockObtenerHistorialCompras: vi.fn(),
  mockCrearCliente: vi.fn(),
  mockActualizarCliente: vi.fn(),
  mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../api/axios', () => ({ default: mockApi }));

vi.mock('../api/clientes', () => ({
  obtenerHistorialCompras: mockObtenerHistorialCompras,
}));

vi.mock('../hooks/useClientes', () => ({
  default: () => ({
    clientes: [
      {
        id_cliente: 7,
        nombre_cliente: 'María López',
        nit: '1234567-K',
        observaciones: 'Cliente frecuente',
      },
    ],
    cargando: false,
    error: null,
    crear: mockCrearCliente,
    actualizar: mockActualizarCliente,
    eliminar: vi.fn(),
  }),
}));

const historial = {
  cliente: {
    id_cliente: 7,
    nombre_cliente: 'María López',
  },
  resumen: {
    total_compras: 1,
    total_articulos: 2,
    monto_total: '125.50',
  },
  compras: [
    {
      id_venta: 31,
      nombre_sucursal: 'Sucursal Central',
      nombre_usuario: 'Vendedor Uno',
      metodo_pago: 'efectivo',
      total: '125.50',
      estado: 'completada',
      fecha_venta: '2026-07-28T15:30:00.000Z',
      cantidad_articulos: 2,
      detalles: [
        {
          id_detalle_venta: 44,
          codigo: 'MED-001',
          nombre_comercial: 'Acetaminofén',
          concentracion: '500 mg',
          presentacion: 'tableta',
          cantidad: 2,
          precio_unitario: '62.75',
          subtotal: '125.50',
        },
      ],
    },
  ],
};

const renderizar = () => render(<ToastProvider><MemoryRouter><Clientes /></MemoryRouter></ToastProvider>);

describe('Clientes', () => {
  beforeEach(() => {
    mockObtenerHistorialCompras.mockReset();
    mockObtenerHistorialCompras.mockResolvedValue(historial);
    mockCrearCliente.mockReset();
    mockCrearCliente.mockResolvedValue({ id_cliente: 8 });
    mockActualizarCliente.mockReset();
  });

  it('marca solo el nombre como obligatorio y deja los campos opcionales sin asterisco', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));

    expect(screen.getByText('Nombre completo', { selector: 'label' })).toHaveClass('campo-requerido');
    expect(screen.getByLabelText(/NIT/).closest('div').querySelector('label')).not.toHaveClass('campo-requerido');
    expect(screen.getByLabelText(/Observaciones/).closest('div').querySelector('label')).not.toHaveClass('campo-requerido');
  });

  it('muestra el NIT y lo incluye al crear un cliente', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('1234567-K')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    await user.type(screen.getByLabelText('Nombre completo'), 'Carlos Pérez');
    await user.type(screen.getByLabelText(/NIT/), ' 7654321-k ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(mockCrearCliente).toHaveBeenCalledWith({
      nombre_cliente: 'Carlos Pérez',
      nit: '7654321-K',
      observaciones: null,
    });
  });

  it('evita guardar un NIT con formato inválido', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    await user.type(screen.getByLabelText('Nombre completo'), 'Carlos Pérez');
    await user.type(screen.getByLabelText(/NIT/), 'ABC-123');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText(/Ingresa un NIT válido/)).toBeInTheDocument();
    expect(mockCrearCliente).not.toHaveBeenCalled();
  });

  it('consulta y muestra el historial del cliente seleccionado', async () => {
    const user = userEvent.setup();
    renderizar();

    await elegirAccion(user, 'María López', 'Historial');

    expect(mockObtenerHistorialCompras).toHaveBeenCalledWith(7, { pagina: 1, limite: 25 });
    const modal = await screen.findByRole('dialog', { name: 'Historial de ventas' });

    expect(within(modal).getByText('María López')).toBeInTheDocument();
    expect(within(modal).getByText('Compras completadas')).toBeInTheDocument();
    expect(within(modal).getByText('Venta #31')).toBeInTheDocument();
    expect(within(modal).getByText('Sucursal Central')).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: 'Ver detalle' }));

    expect(within(modal).getByText('Acetaminofén')).toBeInTheDocument();
    expect(within(modal).getByText(/MED-001/)).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando el cliente no tiene ventas asociadas', async () => {
    mockObtenerHistorialCompras.mockResolvedValue({
      ...historial,
      resumen: {
        total_compras: 0,
        total_articulos: 0,
        monto_total: '0.00',
      },
      compras: [],
    });
    const user = userEvent.setup();
    renderizar();

    await elegirAccion(user, 'María López', 'Historial');

    await waitFor(() => {
      expect(screen.getByText('Sin ventas registradas')).toBeInTheDocument();
    });
    expect(screen.getByText('Este cliente todavía no tiene compras asociadas.')).toBeInTheDocument();
  });

  it('muestra ventas anuladas y el estado sin artículos al expandirlas', async () => {
    mockObtenerHistorialCompras.mockResolvedValue({
      ...historial,
      compras: [{
        ...historial.compras[0],
        estado: 'anulada',
        fecha_venta: 'fecha-invalida',
        cantidad_articulos: 1,
        motivo_anulacion: 'Error de cobro',
        detalles: [],
      }],
    });
    const user = userEvent.setup();
    renderizar();

    await elegirAccion(user, 'María López', 'Historial');
    const modal = await screen.findByRole('dialog', { name: 'Historial de ventas' });

    expect(within(modal).getByText('Anulada')).toBeInTheDocument();
    expect(within(modal).getByText('Fecha no disponible')).toBeInTheDocument();
    expect(within(modal).getByText('1 artículo')).toBeInTheDocument();
    expect(within(modal).getByText('Motivo de anulación: Error de cobro')).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Ver detalle' }));
    expect(within(modal).getByText('Esta venta no tiene artículos disponibles para mostrar.')).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Ocultar detalle' }));
    expect(within(modal).queryByText('Esta venta no tiene artículos disponibles para mostrar.')).not.toBeInTheDocument();
  });

  it('ofrece reintentar cuando falla la carga del historial', async () => {
    mockObtenerHistorialCompras
      .mockRejectedValueOnce({ response: { data: { mensaje: 'Servicio no disponible' } } })
      .mockResolvedValueOnce(historial);
    const user = userEvent.setup();
    renderizar();

    await elegirAccion(user, 'María López', 'Historial');
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Venta #31')).toBeInTheDocument();
    expect(mockObtenerHistorialCompras).toHaveBeenCalledTimes(2);
  });

  it('no consulta contactos hasta abrir el modal de un cliente', () => {
    renderizar();

    expect(screen.queryByRole('dialog', { name: 'Contactos' })).not.toBeInTheDocument();
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('abre los contactos del cliente, agrega un teléfono y cierra el modal', async () => {
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/telefonos')
        ? [{ id_telefono: 1, id_cliente: 7, numero: '55551234' }]
        : [{ id_email: 2, id_cliente: 7, correo: 'maria@farmacom.test' }],
    }));
    mockApi.post.mockResolvedValue({ data: { id_telefono: 3, id_cliente: 7, numero: '50255559999' } });
    const user = userEvent.setup();
    renderizar();

    await elegirAccion(user, 'María López', 'Contactos');

    const modal = await screen.findByRole('dialog', { name: 'Contactos' });
    expect(mockApi.get).toHaveBeenCalledWith('/clientes/7/telefonos');
    expect(mockApi.get).toHaveBeenCalledWith('/clientes/7/correos');
    expect(within(modal).getByText('María López')).toBeInTheDocument();
    expect(await within(modal).findByText('5555-1234')).toBeInTheDocument();
    expect(within(modal).getByText('maria@farmacom.test')).toBeInTheDocument();

    await user.type(within(modal).getByRole('textbox', { name: 'Nuevo teléfono' }), '5025 5559999');
    await user.click(within(modal).getAllByRole('button', { name: 'Agregar' })[0]);

    expect(mockApi.post).toHaveBeenCalledWith('/clientes/7/telefonos', { numero: '5025 5559999' });
    expect(await within(modal).findByText('50255559999')).toBeInTheDocument();

    await user.click(within(modal).getAllByRole('button', { name: 'Cerrar' })[0]);
    expect(screen.queryByRole('dialog', { name: 'Contactos' })).not.toBeInTheDocument();
  });
});
