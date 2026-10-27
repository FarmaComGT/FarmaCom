-- Permite eliminar por completo a un paciente del laboratorio (junto con su
-- expediente, visitas y resultados) desde la aplicación. Antes, las llaves
-- foraneas de visita_laboratorio y resultado_laboratorio bloqueaban con
-- RESTRICT cualquier intento de borrar el expediente del que dependen.

ALTER TABLE visita_laboratorio
    DROP CONSTRAINT IF EXISTS fk_visita_expediente;

ALTER TABLE visita_laboratorio
    ADD CONSTRAINT fk_visita_expediente
    FOREIGN KEY (id_expediente)
    REFERENCES expediente_laboratorio(id_expediente)
    ON DELETE CASCADE;

ALTER TABLE resultado_laboratorio
    DROP CONSTRAINT IF EXISTS fk_resultado_expediente;

ALTER TABLE resultado_laboratorio
    ADD CONSTRAINT fk_resultado_expediente
    FOREIGN KEY (id_expediente)
    REFERENCES expediente_laboratorio(id_expediente)
    ON DELETE CASCADE;
