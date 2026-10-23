import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useContactosCliente from '../../hooks/useContactosCliente';
import ClienteContactosModal, { formatearTelefono } from './ClienteContactosModal.jsx';

vi.mock('../../hooks/useContactosCliente', () => ({ default: vi.fn() }));

const cliente = { id_cliente: 3, nombre_cliente: 'Ana López' };

const acciones = {
  agregarTelefono: vi.fn(),
  actualizarTelefono: vi.fn(),
  eliminarTelefono: vi.fn(),
  agregarCorreo: vi.fn(),
  actualizarCorreo: vi.fn(),
  eliminarCorreo: vi.fn(),
};

const usarContactos = (estado = {}) => {
  useContactosCliente.mockReturnValue({
    telefonos: [{ id_telefono: 1, numero: '55551234' }],
    correos: [{ id_email: 7, correo: 'ana@farmacom.test' }],
    cargando: false,
    error: null,
    ...acciones,
    ...estado,
  });
};

const errorBackend = (data) => ({ response: { data } });

const renderizar = (props = {}) => render(
  <ClienteContactosModal cliente={cliente} onClose={vi.fn()} {...props} />,
);

describe('ClienteContactosModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usarContactos();
  });

  it('no se muestra ni carga contactos sin cliente', () => {
    const { container } = render(<ClienteContactosModal cliente={null} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useContactosCliente).toHaveBeenCalledWith(null);
  });

  it('muestra los teléfonos formateados y los correos del cliente', () => {
    renderizar();

    expect(screen.getByRole('dialog', { name: 'Contactos' })).toBeInTheDocument();
    expect(screen.getByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('5555-1234')).toBeInTheDocument();
    expect(screen.getByText('ana@farmacom.test')).toBeInTheDocument();
    expect(useContactosCliente).toHaveBeenCalledWith(3);
  });

  it('indica cuando el cliente no tiene contactos', () => {
    usarContactos({ telefonos: [], correos: [] });
    renderizar();

    expect(screen.getByText('Sin teléfonos registrados.')).toBeInTheDocument();
    expect(screen.getByText('Sin correos registrados.')).toBeInTheDocument();
  });

  it('muestra el estado de carga y el error de carga', () => {
    usarContactos({ telefonos: [], correos: [], cargando: true, error: 'Cliente no encontrado' });
    renderizar();

    expect(screen.getByText('Cargando contactos...')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Cliente no encontrado');
    expect(screen.queryByText('Sin teléfonos registrados.')).not.toBeInTheDocument();
  });

  it('agrega un teléfono y limpia el campo', async () => {
    const user = userEvent.setup();
    acciones.agregarTelefono.mockResolvedValue();
    renderizar();

    const campo = screen.getByRole('textbox', { name: 'Nuevo teléfono' });
    await user.type(campo, ' 5555-9999 ');
    await user.click(screen.getAllByRole('button', { name: 'Agregar' })[0]);

    expect(acciones.agregarTelefono).toHaveBeenCalledWith('5555-9999');
    await waitFor(() => expect(campo).toHaveValue(''));
  });

  it('muestra el detalle de validación del backend al agregar', async () => {
    const user = userEvent.setup();
    acciones.agregarTelefono.mockRejectedValue(errorBackend({
      mensaje: 'La solicitud contiene datos inválidos.',
      errores: [{ msg: 'El teléfono debe tener entre 8 y 15 dígitos, con + opcional al inicio' }],
    }));
    renderizar();

    await user.type(screen.getByRole('textbox', { name: 'Nuevo teléfono' }), '1234');
    await user.click(screen.getAllByRole('button', { name: 'Agregar' })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('entre 8 y 15 dígitos');
    expect(screen.getByRole('textbox', { name: 'Nuevo teléfono' })).toHaveValue('1234');
  });

  it('muestra el mensaje de duplicado al agregar un correo', async () => {
    const user = userEvent.setup();
    acciones.agregarCorreo.mockRejectedValue(errorBackend({
      mensaje: 'El cliente ya tiene registrado ese correo',
    }));
    renderizar();

    await user.type(screen.getByRole('textbox', { name: 'Nuevo correo' }), 'ANA@farmacom.test');
    await user.click(screen.getAllByRole('button', { name: 'Agregar' })[1]);

    expect(acciones.agregarCorreo).toHaveBeenCalledWith('ANA@farmacom.test');
    expect(await screen.findByRole('alert')).toHaveTextContent('El cliente ya tiene registrado ese correo');
  });

  it('usa un mensaje genérico si el error no trae detalle', async () => {
    const user = userEvent.setup();
    acciones.agregarCorreo.mockRejectedValue(new Error('Network Error'));
    renderizar();

    await user.type(screen.getByRole('textbox', { name: 'Nuevo correo' }), 'otro@farmacom.test');
    await user.click(screen.getAllByRole('button', { name: 'Agregar' })[1]);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo agregar');
  });

  it('no envía un contacto vacío', async () => {
    const user = userEvent.setup();
    renderizar();

    const botonAgregar = screen.getAllByRole('button', { name: 'Agregar' })[0];
    expect(botonAgregar).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Nuevo teléfono' }), '   ');
    expect(botonAgregar).toBeDisabled();
    expect(acciones.agregarTelefono).not.toHaveBeenCalled();
  });

  it('edita un teléfono existente', async () => {
    const user = userEvent.setup();
    acciones.actualizarTelefono.mockResolvedValue();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar teléfono 5555-1234' }));
    const campo = screen.getByRole('textbox', { name: 'Editar teléfono 5555-1234' });
    await user.clear(campo);
    await user.type(campo, '5555-0000');
    await user.click(screen.getByRole('button', { name: 'Guardar teléfono' }));

    expect(acciones.actualizarTelefono).toHaveBeenCalledWith(1, '5555-0000');
    await waitFor(() => expect(
      screen.queryByRole('textbox', { name: 'Editar teléfono 5555-1234' }),
    ).not.toBeInTheDocument());
  });

  it('no llama al backend si el valor editado no cambia', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar correo ana@farmacom.test' }));
    await user.click(screen.getByRole('button', { name: 'Guardar correo' }));

    expect(acciones.actualizarCorreo).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /Editar correo/ })).not.toBeInTheDocument();
  });

  it('muestra el error al editar y permite cancelar la edición', async () => {
    const user = userEvent.setup();
    acciones.actualizarCorreo.mockRejectedValue(errorBackend({
      mensaje: 'El cliente ya tiene registrado ese correo',
    }));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar correo ana@farmacom.test' }));
    const campo = screen.getByRole('textbox', { name: 'Editar correo ana@farmacom.test' });
    await user.clear(campo);
    await user.type(campo, 'repetido@farmacom.test');
    await user.click(screen.getByRole('button', { name: 'Guardar correo' }));

    expect(acciones.actualizarCorreo).toHaveBeenCalledWith(7, 'repetido@farmacom.test');
    expect(await screen.findByRole('alert')).toHaveTextContent('El cliente ya tiene registrado ese correo');

    await user.click(screen.getByRole('button', { name: 'Cancelar edición' }));
    expect(screen.getByText('ana@farmacom.test')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('elimina un teléfono y un correo', async () => {
    const user = userEvent.setup();
    acciones.eliminarTelefono.mockResolvedValue();
    acciones.eliminarCorreo.mockResolvedValue();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar teléfono 5555-1234' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar correo ana@farmacom.test' }));

    expect(acciones.eliminarTelefono).toHaveBeenCalledWith(1);
    expect(acciones.eliminarCorreo).toHaveBeenCalledWith(7);
  });

  it('muestra el error si no se puede eliminar y vuelve a habilitar el botón', async () => {
    const user = userEvent.setup();
    acciones.eliminarTelefono.mockRejectedValue(errorBackend({ mensaje: 'Teléfono no encontrado' }));
    renderizar();

    const botonEliminar = screen.getByRole('button', { name: 'Eliminar teléfono 5555-1234' });
    await user.click(botonEliminar);

    expect(await screen.findByRole('alert')).toHaveTextContent('Teléfono no encontrado');
    expect(botonEliminar).toBeEnabled();
  });

  it('cierra el modal desde la X y desde el pie', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderizar({ onClose });

    const [botonX, botonPie] = screen.getAllByRole('button', { name: 'Cerrar' });
    await user.click(botonX);
    await user.click(botonPie);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('formatearTelefono', () => {
  it.each([
    ['55551234', '5555-1234'],
    ['+50255551234', '+502 5555-1234'],
    ['+15551234567', '+15551234567'],
    [null, ''],
  ])('formatea %p como %p', (numero, esperado) => {
    expect(formatearTelefono(numero)).toBe(esperado);
  });
});
