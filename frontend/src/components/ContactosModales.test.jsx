import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useContactosCasa from '../hooks/useContactosCasa';
import useContactosProveedor from '../hooks/useContactosProveedor';
import useContactosSucursal from '../hooks/useContactosSucursal';
import CasaContactosModal from './inventario/casas/CasaContactosModal.jsx';
import ProveedorContactosModal from './inventario/proveedores/ProveedorContactosModal.jsx';
import ContactosSucursalModal from './sucursales/ContactosSucursalModal.jsx';

vi.mock('../hooks/useContactosCasa', () => ({ default: vi.fn() }));
vi.mock('../hooks/useContactosProveedor', () => ({ default: vi.fn() }));
vi.mock('../hooks/useContactosSucursal', () => ({ default: vi.fn() }));

const acciones = {
  agregarTelefono: vi.fn(),
  actualizarTelefono: vi.fn(),
  eliminarTelefono: vi.fn(),
  agregarCorreo: vi.fn(),
  actualizarCorreo: vi.fn(),
  eliminarCorreo: vi.fn(),
};

const modales = [
  {
    nombre: 'casa farmacéutica',
    Modal: CasaContactosModal,
    hook: useContactosCasa,
    props: { casa: { id_casa: 4, nombre: 'Bayer' } },
    idPadre: 4,
    titulo: 'Bayer',
    telefono: { id_telefono: 1, numero: '2222-3333' },
    correo: { id_email: 2, correo: 'ventas@bayer.test' },
    etiquetas: { editar: 'Editar', guardar: 'Guardar', cancelar: 'Cancelar' },
    sinTelefonos: 'Sin teléfonos registrados.',
    cargando: 'Cargando información...',
    extra: { proveedores: [] },
  },
  {
    nombre: 'proveedor',
    Modal: ProveedorContactosModal,
    hook: useContactosProveedor,
    props: { proveedor: { id_proveedor: 6, nombre: 'Distribuidora ABC' } },
    idPadre: 6,
    titulo: 'Contactos - Distribuidora ABC',
    telefono: { id_telefono: 1, numero: '2222-3333' },
    correo: { id_email: 2, correo: 'pedidos@abc.test' },
    etiquetas: { editar: 'Editar contacto', guardar: 'Guardar contacto', cancelar: 'Cancelar edicion' },
    sinTelefonos: 'Sin telefonos registrados.',
    cargando: 'Cargando contactos...',
    extra: {},
  },
  {
    nombre: 'sucursal',
    Modal: ContactosSucursalModal,
    hook: useContactosSucursal,
    props: { sucursal: { id_sucursal: 8, nombre_sucursal: 'Central' } },
    idPadre: 8,
    titulo: 'Contactos — Central',
    telefono: { id_telefono_sucursal: 1, numero: '2222-3333' },
    correo: { id_correo_sucursal: 2, correo: 'central@farma.test' },
    etiquetas: { editar: 'Editar contacto', guardar: 'Guardar contacto', cancelar: 'Cancelar edicion' },
    sinTelefonos: 'Sin teléfonos registrados.',
    cargando: 'Cargando contactos...',
    extra: {},
  },
];

describe.each(modales)('modal de contactos de $nombre', ({
  Modal, hook, props, idPadre, titulo, telefono, correo, etiquetas, sinTelefonos, cargando, extra,
}) => {
  const usarContactos = (estado = {}) => {
    hook.mockReturnValue({
      telefonos: [telefono],
      correos: [correo],
      cargando: false,
      error: null,
      ...extra,
      ...acciones,
      ...estado,
    });
  };

  const renderizar = (otrasProps = {}) => render(
    <Modal isOpen onClose={vi.fn()} {...props} {...otrasProps} />,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    usarContactos();
  });

  it('no consulta contactos mientras está cerrado', () => {
    render(<Modal isOpen={false} onClose={vi.fn()} {...props} />);

    expect(hook).toHaveBeenCalledWith(null);
    expect(screen.queryByText(titulo)).not.toBeInTheDocument();
  });

  it('muestra los contactos del registro abierto', () => {
    renderizar();

    expect(hook).toHaveBeenCalledWith(idPadre);
    expect(screen.getByText(titulo)).toBeInTheDocument();
    expect(screen.getByText(telefono.numero)).toBeInTheDocument();
    expect(screen.getByText(correo.correo)).toBeInTheDocument();
  });

  it('muestra los estados vacío, de carga y de error', () => {
    usarContactos({ telefonos: [], correos: [] });
    const { unmount } = renderizar();
    expect(screen.getByText(sinTelefonos)).toBeInTheDocument();
    expect(screen.getByText('Sin correos registrados.')).toBeInTheDocument();
    unmount();

    usarContactos({ telefonos: [], correos: [], cargando: true, error: 'No se pudieron cargar' });
    renderizar();
    expect(screen.getByText(cargando)).toBeInTheDocument();
    expect(screen.getByText('No se pudieron cargar')).toBeInTheDocument();
    expect(screen.queryByText(sinTelefonos)).not.toBeInTheDocument();
  });

  it('agrega un teléfono y limpia el campo', async () => {
    const user = userEvent.setup();
    acciones.agregarTelefono.mockResolvedValue();
    renderizar();

    const campo = screen.getByPlaceholderText(/1234-5678|2222-3333/);
    await user.type(campo, ' 5555-1234 ');
    await user.click(screen.getAllByRole('button', { name: /Agregar/ })[0]);

    expect(acciones.agregarTelefono).toHaveBeenCalledWith('5555-1234');
    await waitFor(() => expect(campo).toHaveValue(''));
  });

  it('muestra el error del backend al agregar un correo', async () => {
    const user = userEvent.setup();
    acciones.agregarCorreo.mockRejectedValue({ response: { data: { mensaje: 'Ya existe ese correo' } } });
    renderizar();

    const campoCorreo = screen.getAllByRole('textbox').at(-1);
    await user.type(campoCorreo, 'repetido@farma.test');
    await user.click(screen.getAllByRole('button', { name: /Agregar/ }).at(-1));

    expect(acciones.agregarCorreo).toHaveBeenCalledWith('repetido@farma.test');
    expect(await screen.findByText('Ya existe ese correo')).toBeInTheDocument();
    expect(campoCorreo).toHaveValue('repetido@farma.test');
  });

  it('usa un mensaje genérico si el error al agregar no trae detalle', async () => {
    const user = userEvent.setup();
    acciones.agregarTelefono.mockRejectedValue(new Error('Network Error'));
    renderizar();

    await user.type(screen.getByPlaceholderText(/1234-5678|2222-3333/), '5555-1234');
    await user.click(screen.getAllByRole('button', { name: /Agregar/ })[0]);

    expect(await screen.findByText('No se pudo agregar')).toBeInTheDocument();
  });

  it('edita un teléfono existente', async () => {
    const user = userEvent.setup();
    acciones.actualizarTelefono.mockResolvedValue();
    renderizar();

    await user.click(screen.getAllByRole('button', { name: etiquetas.editar })[0]);
    const campo = screen.getByDisplayValue(telefono.numero);
    await user.clear(campo);
    await user.type(campo, '5555-0000');
    await user.click(screen.getByRole('button', { name: etiquetas.guardar }));

    const idTelefono = telefono.id_telefono ?? telefono.id_telefono_sucursal;
    expect(acciones.actualizarTelefono).toHaveBeenCalledWith(idTelefono, '5555-0000');
    await waitFor(() => expect(screen.queryByDisplayValue('5555-0000')).not.toBeInTheDocument());
  });

  it('no llama al backend si el valor editado no cambia', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getAllByRole('button', { name: etiquetas.editar })[1]);
    await user.click(screen.getByRole('button', { name: etiquetas.guardar }));

    expect(acciones.actualizarCorreo).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue(correo.correo)).not.toBeInTheDocument();
  });

  it('muestra el error al editar y permite cancelar', async () => {
    const user = userEvent.setup();
    acciones.actualizarCorreo.mockRejectedValue({ response: { data: { mensaje: 'Correo duplicado' } } });
    renderizar();

    await user.click(screen.getAllByRole('button', { name: etiquetas.editar })[1]);
    const campo = screen.getByDisplayValue(correo.correo);
    await user.clear(campo);
    await user.type(campo, 'otro@farma.test');
    await user.click(screen.getByRole('button', { name: etiquetas.guardar }));

    const idCorreo = correo.id_email ?? correo.id_correo_sucursal;
    expect(acciones.actualizarCorreo).toHaveBeenCalledWith(idCorreo, 'otro@farma.test');
    expect(await screen.findByText('Correo duplicado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: etiquetas.cancelar }));
    expect(screen.getByText(correo.correo)).toBeInTheDocument();
    expect(screen.queryByText('Correo duplicado')).not.toBeInTheDocument();
  });

  it('elimina un teléfono y un correo', async () => {
    const user = userEvent.setup();
    acciones.eliminarTelefono.mockResolvedValue();
    acciones.eliminarCorreo.mockResolvedValue();
    renderizar();

    const [eliminarTelefono, eliminarCorreo] = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(eliminarTelefono);
    await user.click(eliminarCorreo);

    expect(acciones.eliminarTelefono).toHaveBeenCalledWith(telefono.id_telefono ?? telefono.id_telefono_sucursal);
    expect(acciones.eliminarCorreo).toHaveBeenCalledWith(correo.id_email ?? correo.id_correo_sucursal);
  });

  it('cierra desde la X y desde el pie', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderizar({ onClose });

    for (const boton of screen.getAllByRole('button', { name: 'Cerrar' })) {
      await user.click(boton);
    }

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('proveedores asociados a una casa farmacéutica', () => {
  const props = { isOpen: true, onClose: vi.fn(), casa: { id_casa: 4, nombre: 'Bayer' } };

  it('lista los proveedores vinculados con su estado', () => {
    useContactosCasa.mockReturnValue({
      telefonos: [],
      correos: [],
      proveedores: [
        { id_proveedor: 1, nombre: 'Distribuidora ABC', activo: true },
        { id_proveedor: 2, nombre: 'Farma Norte', activo: false },
      ],
      cargando: false,
      error: null,
      ...acciones,
    });

    render(<CasaContactosModal {...props} />);

    expect(screen.getByText('Distribuidora ABC')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Farma Norte')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('indica cuando no hay proveedores vinculados', () => {
    useContactosCasa.mockReturnValue({
      telefonos: [], correos: [], proveedores: [], cargando: false, error: null, ...acciones,
    });

    render(<CasaContactosModal {...props} />);

    expect(screen.getByText('No hay proveedores vinculados a esta casa farmacéutica.')).toBeInTheDocument();
  });
});
