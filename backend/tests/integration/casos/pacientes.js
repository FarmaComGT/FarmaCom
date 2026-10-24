const DPI_PRUEBA = '9999999999999';
const DPI_ROLLBACK = '9999999999998';

module.exports = ({ app, iniciarSesion, pool, request }) => {
  describe('Integración de pacientes y laboratorios', () => {
    test('crea paciente y expediente en una sola operación transaccional', async () => {
      const { respuesta: sesion, cookie } = await iniciarSesion('laboratorista@farma.com');
      const idLaboratorio = sesion.body.usuario.id_laboratorio;

      const respuesta = await request(app)
        .post('/api/pacientes')
        .set('Cookie', cookie)
        .send({
          id_laboratorio: idLaboratorio,
          nombre_paciente: 'Paciente Integración CI',
          dpi: DPI_PRUEBA,
          edad_manual: 34,
          sexo: 'F',
          telefono: '5555-0101',
          direccion: 'Datos ficticios para CI',
        })
        .expect(201);

      expect(respuesta.body).toMatchObject({
        nombre_paciente: 'Paciente Integración CI',
        dpi: DPI_PRUEBA,
        edad: 34,
      });
      expect(respuesta.body.id_expediente).toEqual(expect.any(Number));

      const persistencia = await pool.query(
        `SELECT p.id_paciente, e.id_expediente
         FROM paciente p
         JOIN expediente_laboratorio e ON e.id_paciente = p.id_paciente
         WHERE p.dpi = $1`,
        [DPI_PRUEBA],
      );
      expect(persistencia.rows).toHaveLength(1);
    });

    test('revierte el paciente si falla la creación de su expediente', async () => {
      const { respuesta: sesion, cookie } = await iniciarSesion('laboratorista@farma.com');
      const idLaboratorio = sesion.body.usuario.id_laboratorio;
      const errorEsperado = jest.spyOn(console, 'error').mockImplementation(() => {});

      await pool.query(`
        CREATE OR REPLACE FUNCTION integration_fallar_expediente()
        RETURNS TRIGGER AS $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM paciente
            WHERE id_paciente = NEW.id_paciente AND dpi = '${DPI_ROLLBACK}'
          ) THEN
            RAISE EXCEPTION 'Fallo controlado para comprobar el rollback';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER integration_fallar_expediente_trigger
        BEFORE INSERT ON expediente_laboratorio
        FOR EACH ROW EXECUTE FUNCTION integration_fallar_expediente();
      `);

      try {
        await request(app)
          .post('/api/pacientes')
          .set('Cookie', cookie)
          .send({
            id_laboratorio: idLaboratorio,
            nombre_paciente: 'Paciente Rollback Integración',
            dpi: DPI_ROLLBACK,
            edad_manual: 40,
            sexo: 'Otro',
          })
          .expect(500);

        const pacienteParcial = await pool.query(
          'SELECT id_paciente FROM paciente WHERE dpi = $1',
          [DPI_ROLLBACK],
        );
        expect(pacienteParcial.rows).toHaveLength(0);
        expect(errorEsperado).toHaveBeenCalled();
      } finally {
        errorEsperado.mockRestore();
        await pool.query(`
          DROP TRIGGER IF EXISTS integration_fallar_expediente_trigger
            ON expediente_laboratorio;
          DROP FUNCTION IF EXISTS integration_fallar_expediente();
        `);
      }
    });

    test('consulta por API el paciente y el expediente persistidos', async () => {
      const { cookie } = await iniciarSesion('laboratorista@farma.com');
      const paciente = await pool.query(
        'SELECT id_paciente FROM paciente WHERE dpi = $1',
        ['1234567890101'],
      );
      const respuesta = await request(app)
        .get(`/api/pacientes/${paciente.rows[0].id_paciente}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(respuesta.body).toMatchObject({
        dpi: '1234567890101',
        nombre_paciente: 'Paciente Demo Uno',
        id_expediente: expect.any(Number),
      });
    });

    test('impide que un laboratorista consulte pacientes de otro laboratorio', async () => {
      const { cookie } = await iniciarSesion('laboratorista@farma.com');
      const pacienteAjeno = await pool.query(
        'SELECT id_paciente FROM paciente WHERE dpi = $1',
        ['1234567890199'],
      );
      const respuesta = await request(app)
        .get(`/api/pacientes/${pacienteAjeno.rows[0].id_paciente}`)
        .set('Cookie', cookie)
        .expect(403);

      expect(respuesta.body.mensaje).toBe('No tienes acceso al recurso solicitado.');
    });
  });
};
