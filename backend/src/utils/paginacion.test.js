const { crearPaginacion } = require('./paginacion');

describe('crearPaginacion', () => {
  it('conserva una p?gina vac?a navegable', () => {
    expect(crearPaginacion(8, 25, 0)).toEqual({ pagina: 1, limite: 25, total: 0, total_paginas: 1 });
  });
  it('recupera la ?ltima p?gina disponible', () => {
    expect(crearPaginacion(99, 25, 26)).toEqual({ pagina: 2, limite: 25, total: 26, total_paginas: 2 });
  });
});
