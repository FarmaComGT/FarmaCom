import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultadoUploadModal from './ResultadoUploadModal';

const propsBase = {
  isOpen: true,
  categoriasSugeridas: ['Hematología', 'Orina'],
  subiendo: false,
  errorFormulario: null,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

const crearArchivo = (nombre, tipo, tamano = 1024) => {
  const archivo = new File(['contenido'], nombre, { type: tipo });
  Object.defineProperty(archivo, 'size', { value: tamano });
  return archivo;
};

describe('ResultadoUploadModal', () => {
  it('rechaza un archivo que no es PDF', async () => {
    // Se usa fireEvent en vez de userEvent.upload porque el input respeta
    // accept="application/pdf" y userEvent filtra archivos no coincidentes
    // antes de disparar el change, igual que el selector nativo del navegador.
    // La validación real contra archivos no-PDF importa sobre todo para el
    // flujo de arrastrar y soltar, que sí permite cualquier tipo de archivo.
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ResultadoUploadModal {...propsBase} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Categoría del examen/), 'Hematología');
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [crearArchivo('resultado.txt', 'text/plain')] } });

    expect(screen.getByText('Solo se aceptan archivos PDF.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Subir resultado' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rechaza un PDF que supera el tamaño máximo', async () => {
    const user = userEvent.setup();
    render(<ResultadoUploadModal {...propsBase} />);

    const input = document.querySelector('input[type="file"]');
    await user.upload(input, crearArchivo('grande.pdf', 'application/pdf', 11 * 1024 * 1024));

    expect(screen.getByText(/supera el tamaño máximo/)).toBeInTheDocument();
  });

  it('envía la categoría y el archivo cuando son válidos', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ResultadoUploadModal {...propsBase} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Categoría del examen/), 'Sangre');
    const input = document.querySelector('input[type="file"]');
    const archivo = crearArchivo('resultado.pdf', 'application/pdf');
    await user.upload(input, archivo);
    await user.click(screen.getByRole('button', { name: 'Subir resultado' }));

    expect(onSubmit).toHaveBeenCalledWith({ categoria: 'Sangre', archivo });
  });

  it('rechaza un archivo no-PDF soltado en la zona de arrastrar y soltar', () => {
    render(<ResultadoUploadModal {...propsBase} />);

    const dropzone = screen.getByLabelText('Elige el archivo y suéltalo aquí');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [crearArchivo('resultado.docx', 'application/msword')] },
    });

    expect(screen.getByText('Solo se aceptan archivos PDF.')).toBeInTheDocument();
  });

  it('exige categoría y archivo antes de enviar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ResultadoUploadModal {...propsBase} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Subir resultado' }));

    expect(screen.getByText('Ingresa la categoría del examen.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
