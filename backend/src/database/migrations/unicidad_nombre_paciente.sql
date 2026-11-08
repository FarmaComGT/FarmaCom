-- Migracion historica retirada: el nombre no identifica de forma unica a
-- una persona. Las carpetas locales incluyen id_paciente y no colisionan.
-- Se conserva este archivo por compatibilidad con instalaciones antiguas,
-- pero ahora revierte la restriccion para permitir homonimos.

BEGIN;

DROP INDEX IF EXISTS uq_paciente_nombre;

COMMIT;
