const { validationResult } = require('express-validator');
const {
  validarPaginacion,
  validarBusqueda,
  completarPaginacion,
} = require('./paginacionValidators');

const ejecutarValidaciones = async (validaciones, query = {}) => {
  const req = { query };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return { req, errores: validationResult(req).array() };
};

describe('validarPaginacion', () => {
  it('acepta parametros omitidos', async () => {
    const { errores } = await ejecutarValidaciones(validarPaginacion);
    expect(errores).toEqual([]);
  });

  it('convierte pagina y limite validos a numeros', async () => {
    const { req, errores } = await ejecutarValidaciones(validarPaginacion, {
      pagina: '2',
      limite: '50',
    });

    expect(errores).toEqual([]);
    expect(req.query).toEqual({ pagina: 2, limite: 50 });
  });

  it.each([
    [{ pagina: 2 }, 'pagina'],
    [{ pagina: '0' }, 'pagina'],
    [{ limite: 25 }, 'limite'],
    [{ limite: '101' }, 'limite'],
  ])('rechaza el parametro invalido %#', async (query, parametro) => {
    const { errores } = await ejecutarValidaciones(validarPaginacion, query);

    expect(errores).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: parametro }),
    ]));
  });
});

describe('validarBusqueda', () => {
  it('acepta una busqueda omitida', async () => {
    const { errores } = await ejecutarValidaciones([validarBusqueda()]);
    expect(errores).toEqual([]);
  });

  it('recorta una busqueda valida', async () => {
    const { req, errores } = await ejecutarValidaciones([validarBusqueda()], {
      busqueda: '  Bayer  ',
    });

    expect(errores).toEqual([]);
    expect(req.query.busqueda).toBe('Bayer');
  });

  it('rechaza valores que no son texto', async () => {
    const { errores } = await ejecutarValidaciones([validarBusqueda()], { busqueda: 12 });

    expect(errores).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'busqueda' }),
    ]));
  });

  it('aplica el limite personalizado', async () => {
    const { errores } = await ejecutarValidaciones([validarBusqueda(5)], {
      busqueda: 'abcdef',
    });

    expect(errores).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'busqueda',
        msg: 'busqueda no puede superar los 5 caracteres',
      }),
    ]));
  });
});

describe('completarPaginacion', () => {
  it('conserva los filtros cuando no se solicita paginacion', () => {
    expect(completarPaginacion()).toEqual({});
    expect(completarPaginacion({ busqueda: 'Bayer' })).toEqual({ busqueda: 'Bayer' });
  });

  it('conserva pagina y limite cuando ambos fueron enviados', () => {
    expect(completarPaginacion({ pagina: 3, limite: 10 })).toEqual({
      pagina: 3,
      limite: 10,
    });
  });

  it('completa el limite predeterminado cuando solo se envia pagina', () => {
    expect(completarPaginacion({ pagina: 2 })).toEqual({ pagina: 2, limite: 25 });
  });

  it('completa la primera pagina cuando solo se envia limite', () => {
    expect(completarPaginacion({ limite: 15 }, 50)).toEqual({ pagina: 1, limite: 15 });
  });
});
