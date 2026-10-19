const {
  obtenerIdUsuario,
  tieneAccesoSesionCaja,
  validarPertenenciaSesionCaja,
} = require('./accesoCaja');

const sesion = { id_usuario_apertura: 7 };

describe('accesoCaja', () => {
  it.each(['dueno', 'administrador'])(
    'permite acceso global al rol %s',
    (rol) => {
      expect(tieneAccesoSesionCaja({ id_usuario: 1, rol }, sesion)).toBe(true);
    },
  );

  it('permite al dependiente acceder a su propia sesión', () => {
    expect(tieneAccesoSesionCaja({ id_usuario: 7, rol: 'dependiente' }, sesion))
      .toBe(true);
  });

  it('rechaza al dependiente que intenta acceder a una sesión ajena', () => {
    expect(() => validarPertenenciaSesionCaja(
      { id_usuario: 8, rol: 'dependiente' },
      sesion,
    )).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('no concede la excepción global a roles no autorizados', () => {
    expect(() => validarPertenenciaSesionCaja(
      { id_usuario: 7, rol: 'laboratorista' },
      sesion,
    )).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('rechaza una identidad no autenticada', () => {
    expect(() => obtenerIdUsuario(null)).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });
});
