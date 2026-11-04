import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import useConsultaListado from './useConsultaListado';

it('oculta los metadatos anteriores y descarta respuestas de páginas reemplazadas', async () => {
  let responderAnterior;
  const cargar = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { responderAnterior = resolve; }))
    .mockResolvedValueOnce({ datos: [{ id: 2 }], paginacion: { pagina: 2, total: 26 } });
  const { result, rerender } = renderHook(({ pagina }) => useConsultaListado(cargar, { pagina, limite: 25 }, 'Error'),
    { initialProps: { pagina: 1 } });
  rerender({ pagina: 2 });
  expect(cargar.mock.calls[0][1].signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.paginacion?.pagina).toBe(2));
  await act(async () => responderAnterior({ datos: [{ id: 1 }], paginacion: { pagina: 1, total: 99 } }));
  expect(result.current.datos).toEqual([{ id: 2 }]);
  expect(result.current.paginacion.total).toBe(26);
});
