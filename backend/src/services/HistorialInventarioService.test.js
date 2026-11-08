jest.mock('../daos/BitacoraInventarioDAO');

const BitacoraInventarioDAO = require('../daos/BitacoraInventarioDAO');
const HistorialInventarioService = require('./HistorialInventarioService');

describe('HistorialInventarioService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pagina el historial y conserva todos los filtros', async () => {
    BitacoraInventarioDAO.obtenerHistorial.mockResolvedValue({
      datos: [{ id_evento: 'a-1' }],
      paginacion: { pagina: 2, limite: 25, total: 26, total_paginas: 2 },
    });

    const resultado = await HistorialInventarioService.obtenerHistorial({
      id_producto: 4, lote: 'LT-1', pagina: 2, limite: 25,
    }, { rol: 'administrador' });

    expect(BitacoraInventarioDAO.obtenerHistorial).toHaveBeenCalledWith({
      id_producto: 4, lote: 'LT-1', pagina: 2, limite: 25,
    });
    expect(resultado.paginacion).toEqual({ pagina: 2, limite: 25, total: 26, total_paginas: 2 });
  });

  it('limita al dependiente a su propia sucursal', async () => {
    BitacoraInventarioDAO.obtenerHistorial.mockResolvedValue({
      datos: [], paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 },
    });

    await HistorialInventarioService.obtenerHistorial(
      { pagina: 1 },
      { rol: 'dependiente', id_sucursal: 3 },
    );

    expect(BitacoraInventarioDAO.obtenerHistorial).toHaveBeenCalledWith(
      expect.objectContaining({ id_sucursal: 3 }),
    );
  });

  it('rechaza que un dependiente consulte otra sucursal', async () => {
    await expect(HistorialInventarioService.obtenerHistorial(
      { id_sucursal: 8 },
      { rol: 'dependiente', id_sucursal: 3 },
    )).rejects.toMatchObject({ status: 403 });
    expect(BitacoraInventarioDAO.obtenerHistorial).not.toHaveBeenCalled();
  });
});
