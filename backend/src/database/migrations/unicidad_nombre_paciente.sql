-- Evita pacientes con el mismo nombre (normalizado): el nombre se usa para
-- nombrar la carpeta de respaldo local de cada paciente en el modulo de
-- laboratorio, y dos pacientes con el mismo nombre chocarian esa carpeta.
-- Es idempotente: puede ejecutarse mas de una vez sin duplicar objetos.
--
-- IMPORTANTE: antes de correr este archivo en una base con datos reales,
-- verificar que no existan ya nombres duplicados; si esta query devuelve
-- filas, hay que renombrar esos pacientes a mano antes de continuar (el
-- CREATE UNIQUE INDEX de abajo fallara si hay duplicados):
--
-- SELECT lower(trim(nombre_paciente)) AS nombre, array_agg(id_paciente)
-- FROM paciente GROUP BY 1 HAVING count(*) > 1;

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_paciente_nombre
    ON paciente (LOWER(TRIM(nombre_paciente)));

COMMIT;
