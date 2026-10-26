const { obtenerIdUsuario, validarPertenenciaLaboratorio } = require('./accesoLaboratorio');

describe('accesoLaboratorio', () => {
  describe('obtenerIdUsuario', () => {
    it('devuelve el id de un usuario autenticado', () => {
      expect(obtenerIdUsuario({ id_usuario: 4 })).toBe(4);
    });

    it.each([undefined, null, {}, { id_usuario: 0 }, { id_usuario: '4' }, { id_usuario: 1.5 }])(
      'responde 401 para %p',
      (usuario) => {
        expect(() => obtenerIdUsuario(usuario)).toThrow(expect.objectContaining({ status: 401 }));
      },
    );
  });

  describe('validarPertenenciaLaboratorio', () => {
    it.each(['dueno', 'administrador'])('permite a %s operar sobre cualquier laboratorio', (rol) => {
      expect(() => validarPertenenciaLaboratorio({ id_usuario: 1, rol, id_laboratorio: null }, 9)).not.toThrow();
    });

    it('permite al laboratorista operar sobre su laboratorio asignado', () => {
      expect(() => validarPertenenciaLaboratorio(
        { id_usuario: 2, rol: 'laboratorista', id_laboratorio: 3 },
        '3',
      )).not.toThrow();
    });

    it.each([
      ['otro laboratorio', { id_laboratorio: 3 }, 4],
      ['sin laboratorio asignado', { id_laboratorio: null }, 4],
      ['un laboratorio inválido en el recurso', { id_laboratorio: 3 }, 'abc'],
    ])('impide al laboratorista operar sobre %s', (_caso, asignacion, idRecurso) => {
      expect(() => validarPertenenciaLaboratorio(
        { id_usuario: 2, rol: 'laboratorista', ...asignacion },
        idRecurso,
      )).toThrow(expect.objectContaining({ status: 403, message: 'No tienes acceso al recurso solicitado.' }));
    });

    it('exige un usuario autenticado antes de revisar el rol', () => {
      expect(() => validarPertenenciaLaboratorio(null, 1)).toThrow(expect.objectContaining({ status: 401 }));
    });
  });
});
