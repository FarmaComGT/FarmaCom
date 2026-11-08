-- El DPI identifica a una persona; el nombre no. Las carpetas locales ya
-- incluyen id_paciente, por lo que los homonimos no colisionan.
DROP INDEX IF EXISTS uq_paciente_nombre;
