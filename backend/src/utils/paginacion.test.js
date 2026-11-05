const { crearPaginacion, ejecutarConsultaPaginada } = require('./paginacion');

describe('crearPaginacion', () => {
  it('conserva una p?gina vac?a navegable', () => {
    expect(crearPaginacion(8, 25, 0)).toEqual({ pagina: 1, limite: 25, total: 0, total_paginas: 1 });
  });
  it('recupera la ?ltima p?gina disponible', () => {
    expect(crearPaginacion(99, 25, 26)).toEqual({ pagina: 2, limite: 25, total: 26, total_paginas: 2 });
  });
});

describe('ejecutarConsultaPaginada', () => {
  it('pagina una consulta sin parametros iniciales', async () => {
    const cliente = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }),
    };

    const resultado = await ejecutarConsultaPaginada({
      cliente,
      consultaBase: 'SELECT id FROM ejemplo',
      orden: 'ORDER BY id',
      pagina: 1,
      limite: 2,
    });

    expect(resultado).toEqual({
      datos: [{ id: 1 }, { id: 2 }],
      paginacion: { pagina: 1, limite: 2, total: 3, total_paginas: 2 },
    });
    expect(cliente.query).toHaveBeenNthCalledWith(
      1,
      'SELECT COUNT(*) AS total FROM (SELECT id FROM ejemplo) AS consulta_paginada',
      expect.any(Array),
    );
    expect(cliente.query).toHaveBeenNthCalledWith(
      2,
      'SELECT id FROM ejemplo ORDER BY id LIMIT $1 OFFSET $2',
      [2, 0],
    );
  });

  it('consulta la ultima pagina disponible cuando la solicitada queda fuera de rango', async () => {
    const cliente = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '26' }] })
        .mockResolvedValueOnce({ rows: [{ id: 26 }] }),
    };

    const resultado = await ejecutarConsultaPaginada({
      cliente,
      consultaBase: 'SELECT id FROM ejemplo WHERE activo = $1',
      valores: [true],
      orden: 'ORDER BY id',
      pagina: 99,
      limite: 25,
    });

    expect(resultado).toEqual({
      datos: [{ id: 26 }],
      paginacion: { pagina: 2, limite: 25, total: 26, total_paginas: 2 },
    });
    expect(cliente.query).toHaveBeenNthCalledWith(
      2,
      'SELECT id FROM ejemplo WHERE activo = $1 ORDER BY id LIMIT $2 OFFSET $3',
      [true, 25, 25],
    );
  });
});
