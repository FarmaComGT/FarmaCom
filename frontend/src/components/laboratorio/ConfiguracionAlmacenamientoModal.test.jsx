import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConfiguracionAlmacenamientoModal from './ConfiguracionAlmacenamientoModal.jsx';

describe('ConfiguracionAlmacenamientoModal', () => {
  let props;

  beforeEach(() => {
    props = {
      isOpen: true,
      soportado: true,
      carpetaConfigurada: false,
      onElegir: vi.fn().mockResolvedValue(undefined),
      onReconectar: vi.fn().mockResolvedValue(true),
      onClose: vi.fn(),
    };
  });

  it('no muestra el modal cuando está cerrado', () => {
    render(<ConfiguracionAlmacenamientoModal {...props} isOpen={false} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explica la limitación del navegador y oculta las acciones de almacenamiento', () => {
    render(<ConfiguracionAlmacenamientoModal {...props} soportado={false} />);

    expect(screen.getByText(/Esta función solo está disponible en Google Chrome/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Elegir carpeta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconectar carpeta' })).not.toBeInTheDocument();
    expect(props.onElegir).not.toHaveBeenCalled();
    expect(props.onReconectar).not.toHaveBeenCalled();
  });

  it('explica el respaldo y permite elegir una carpeta nueva', async () => {
    const usuario = userEvent.setup();
    render(<ConfiguracionAlmacenamientoModal {...props} />);

    expect(screen.getByRole('heading', { name: 'Configura el respaldo local' })).toBeInTheDocument();
    expect(screen.getByText(/Los resultados en PDF solo permanecen 6 meses/)).toBeInTheDocument();
    expect(screen.getByText(/Mientras no se elija una carpeta/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Elegir carpeta' }));

    expect(props.onElegir).toHaveBeenCalledOnce();
    expect(props.onReconectar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Elegir carpeta' })).toBeEnabled();
  });

  it('permite reconectar una carpeta configurada cuando se concede el permiso', async () => {
    const usuario = userEvent.setup();
    render(<ConfiguracionAlmacenamientoModal {...props} carpetaConfigurada />);

    expect(screen.getByRole('heading', { name: 'Reconecta la carpeta local' })).toBeInTheDocument();
    expect(screen.getByText(/el navegador olvida el permiso de acceso/)).toBeInTheDocument();
    expect(screen.queryByText(/Mientras no se elija una carpeta/)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Reconectar carpeta' }));

    expect(props.onReconectar).toHaveBeenCalledOnce();
    expect(props.onElegir).not.toHaveBeenCalled();
    expect(screen.queryByText('No se otorgó permiso sobre la carpeta local.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconectar carpeta' })).toBeEnabled();
  });

  it('muestra la denegación de permiso y limpia el error al reintentar', async () => {
    const usuario = userEvent.setup();
    props.onReconectar.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<ConfiguracionAlmacenamientoModal {...props} carpetaConfigurada />);

    await usuario.click(screen.getByRole('button', { name: 'Reconectar carpeta' }));
    expect(screen.getByText('No se otorgó permiso sobre la carpeta local.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Reconectar carpeta' }));

    expect(props.onReconectar).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('No se otorgó permiso sobre la carpeta local.')).not.toBeInTheDocument();
  });

  it.each([false, true])('muestra el error de acceso y permite reintentar (carpeta configurada: %s)', async (carpetaConfigurada) => {
    const usuario = userEvent.setup();
    const accion = carpetaConfigurada ? props.onReconectar : props.onElegir;
    const nombreBoton = carpetaConfigurada ? 'Reconectar carpeta' : 'Elegir carpeta';
    accion.mockRejectedValueOnce(new Error('Acceso denegado'));
    render(<ConfiguracionAlmacenamientoModal {...props} carpetaConfigurada={carpetaConfigurada} />);

    await usuario.click(screen.getByRole('button', { name: nombreBoton }));

    expect(screen.getByText('No se pudo acceder a la carpeta seleccionada. Intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: nombreBoton })).toBeEnabled();

    await usuario.click(screen.getByRole('button', { name: nombreBoton }));

    expect(accion).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('No se pudo acceder a la carpeta seleccionada. Intenta de nuevo.')).not.toBeInTheDocument();
  });

  it('permite cancelar el selector sin mostrar un error', async () => {
    const usuario = userEvent.setup();
    props.onElegir.mockRejectedValueOnce(new DOMException('Cancelado', 'AbortError'));
    render(<ConfiguracionAlmacenamientoModal {...props} />);

    await usuario.click(screen.getByRole('button', { name: 'Elegir carpeta' }));

    expect(props.onElegir).toHaveBeenCalledOnce();
    expect(screen.queryByText('No se pudo acceder a la carpeta seleccionada. Intenta de nuevo.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir carpeta' })).toBeEnabled();
  });

  it('deshabilita la acción mientras está pendiente para evitar solicitudes duplicadas', async () => {
    const usuario = userEvent.setup();
    let resolver;
    props.onElegir.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    render(<ConfiguracionAlmacenamientoModal {...props} />);

    await usuario.click(screen.getByRole('button', { name: 'Elegir carpeta' }));
    const procesando = screen.getByRole('button', { name: 'Procesando...' });
    expect(procesando).toBeDisabled();
    await usuario.click(procesando);
    expect(props.onElegir).toHaveBeenCalledOnce();

    await act(async () => { resolver(); });

    expect(screen.getByRole('button', { name: 'Elegir carpeta' })).toBeEnabled();
  });

  it('cierra el modal mediante la acción proporcionada', async () => {
    const usuario = userEvent.setup();
    render(<ConfiguracionAlmacenamientoModal {...props} />);

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('oculta el botón de cierre cuando no se proporciona esa acción', () => {
    render(<ConfiguracionAlmacenamientoModal {...props} onClose={undefined} />);

    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir carpeta' })).toBeInTheDocument();
  });
});
