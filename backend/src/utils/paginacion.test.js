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
