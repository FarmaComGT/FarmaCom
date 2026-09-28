import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  anularResultado,
  construirUrlPublica,
  listarResultados,
  obtenerCategoriasSugeridas,
  subirResultado,
} from './resultadosLaboratorio';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('API de resultados de laboratorio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista los resultados de un paciente', async () => {
    api.get.mockResolvedValue({ data: [{ id_resultado: 1 }] });

    await expect(listarResultados(9)).resolves.toEqual([{ id_resultado: 1 }]);
    expect(api.get).toHaveBeenCalledWith('/resultados-laboratorio', { params: { id_paciente: 9 } });
  });

  it('sube un resultado como multipart/form-data', async () => {
    api.post.mockResolvedValue({ data: { id_resultado: 1 } });
    const archivo = new File(['contenido'], 'resultado.pdf', { type: 'application/pdf' });

    await subirResultado({ idPaciente: 9, categoria: 'Hematología', archivo });

    expect(api.post).toHaveBeenCalledWith(
      '/resultados-laboratorio',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const formDataEnviado = api.post.mock.calls[0][1];
    expect(formDataEnviado.get('id_paciente')).toBe('9');
    expect(formDataEnviado.get('categoria')).toBe('Hematología');
    expect(formDataEnviado.get('archivo')).toBe(archivo);
  });

  it('anula un resultado con motivo', async () => {
    api.patch.mockResolvedValue({ data: { mensaje: 'ok' } });

    await anularResultado(1, 'Error de carga');

    expect(api.patch).toHaveBeenCalledWith('/resultados-laboratorio/1/anular', {
      motivo_anulacion: 'Error de carga',
    });
  });

  it('obtiene categorías sugeridas para un laboratorio', async () => {
    api.get.mockResolvedValue({ data: ['Hematología'] });

    await expect(obtenerCategoriasSugeridas(3)).resolves.toEqual(['Hematología']);
    expect(api.get).toHaveBeenCalledWith('/resultados-laboratorio/categorias', {
      params: { id_laboratorio: 3 },
    });
  });

  it('construye la URL pública a partir del token', () => {
    expect(construirUrlPublica('abc123')).toMatch(/\/resultados-laboratorio\/publico\/abc123$/);
  });
});
