-- Usuario tecnico usado por el job automatico de vencimiento de resultados
-- (purgarResultadosVencidos) para dejar registro en bitacora_laboratorio,
-- que exige un id_usuario responsable. estado_usuario='inactivo' bloquea
-- cualquier intento de inicio de sesion con esta cuenta.
-- Es idempotente: puede ejecutarse mas de una vez sin duplicar el usuario.

BEGIN;

INSERT INTO usuario (id_sucursal, nombre_usuario, correo_usuario, contrasena_hash, rol, estado_usuario)
SELECT
    s.id_sucursal,
    'Sistema (vencimiento automatico)',
    'sistema.laboratorio@farmacom.local',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    'administrador',
    'inactivo'
FROM sucursal s
WHERE s.nombre_sucursal = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario u
      WHERE u.correo_usuario = 'sistema.laboratorio@farmacom.local'
  );

COMMIT;
