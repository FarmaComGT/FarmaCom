# Pruebas de seguridad de FarmaCom

Este directorio contendrá las pruebas dinámicas de seguridad de FarmaCom. El
objetivo es producir resultados reproducibles y accionables sobre la API, no
solo ejecutar un escáner. OWASP ZAP será la herramienta principal y sus
hallazgos se complementarán con comprobaciones explícitas de autenticación,
autorización vertical y aislamiento de recursos.

## Requisitos

- Docker Desktop en ejecución.
- El ambiente local de FarmaCom configurado con datos ficticios.
- La API disponible mediante el servicio `backend` de Docker Compose.

La imagen de ZAP está fijada en la versión `2.17.0` para que distintas
ejecuciones utilicen el mismo núcleo del escáner. Las actualizaciones se harán
mediante un commit explícito y una nueva línea base.

## Configuración inicial

Desde la raíz del repositorio, crea la configuración local:

```powershell
Copy-Item tests/security/.env.security.example tests/security/.env.security
```

El archivo real está ignorado por Git. La configuración inicial no requiere
credenciales porque únicamente comprueba la ruta pública `/api/ping`.

## Ejecutar la comprobación inicial

Con FarmaCom iniciado mediante Docker Compose, ejecuta:

```powershell
docker compose --env-file .env --env-file tests/security/.env.security -f docker-compose.yml -f docker-compose.security.yml --profile security run --rm zap-security
```

El ejecutor permite únicamente el ambiente `local` y las URLs
`http://backend:3000` o `http://host.docker.internal:3000`. Esta protección se
mantendrá para todos los planes que realicen análisis activo.

La comprobación inicial:

1. solicita `GET /api/ping` y exige una respuesta `200`;
2. importa `openapi/read-only.yaml` y visita las operaciones de lectura sin
   enviar credenciales;
3. espera a que termine el análisis pasivo;
4. genera `results/smoke.html` y `results/smoke.json`.

El contrato OpenAPI inicial contiene únicamente operaciones de lectura. El
archivo `openapi/read-only.yaml` funciona como índice y delega cada grupo de
rutas a un archivo dentro de `openapi/paths`. Los parámetros, respuestas y
esquemas de seguridad compartidos están en `openapi/components`.

Las operaciones que crean, editan, anulan o eliminan información se
documentarán en un contrato separado y solo se ejecutarán con datos
desechables. Los campos `x-farmacom-roles` y `x-farmacom-scope` registran la
política que posteriormente utilizarán las comprobaciones explícitas de
autorización.

Los reportes generados están ignorados porque pueden contener solicitudes y
respuestas. Antes de versionar evidencia se debe crear un resumen sanitizado.

## Ejecutar el análisis autenticado de lectura

Configura en `.env.security` un usuario ficticio activo:

```dotenv
ZAP_PLAN=plans/authenticated-read.yaml
ZAP_ADMIN_EMAIL=administrador.pruebas@farmacom.test
ZAP_ADMIN_PASSWORD=reemplazar_con_clave_local
```

Ejecuta el mismo comando de Docker Compose utilizado para la comprobación
inicial. El ejecutor detendrá el proceso antes de iniciar ZAP si falta alguna
credencial.

La cuenta debe tener el rol `administrador` para cubrir usuarios, cierres y
reportes financieros. El plan utiliza `POST /api/auth/login` con un cuerpo JSON,
conserva la cookie `auth_token` y consulta `GET /api/auth/me` para verificar la
sesión. Después importa el contrato de lectura utilizando el mismo usuario. La
ruta de cierre de sesión está excluida del contexto para impedir que el escaneo
invalide su propia sesión.

Una ejecución es válida únicamente si la solicitud autenticada a
`/api/auth/me` devuelve `200`. Si el plan importa rutas pero todas responden
`401`, el resultado no demuestra cobertura autenticada y debe descartarse.

## Objetivos

- Comprobar que todos los endpoints protegidos rechacen solicitudes sin una
  sesión válida.
- Verificar que cada rol solo pueda ejecutar las operaciones permitidas.
- Detectar accesos horizontales indebidos al cambiar identificadores de
  sucursal, usuario, caja, venta, laboratorio, paciente o expediente.
- Identificar vulnerabilidades comunes en entradas, respuestas y configuración
  HTTP mediante análisis pasivo y activo de OWASP ZAP.
- Generar evidencia sanitizada que permita clasificar, mitigar y volver a
  comprobar cada hallazgo.
- Contrastar los resultados con los requisitos no funcionales de seguridad del
  proyecto.

## Alcance inicial

La primera versión se ejecutará sobre los módulos estables disponibles en
`develop`:

| Módulo | Superficie inicial | Riesgos prioritarios |
|---|---|---|
| Autenticación | Inicio de sesión, sesión actual y cierre de sesión | Enumeración de usuarios, evasión del límite de intentos, cookies inseguras y sesiones inválidas |
| Usuarios | Consulta, creación, edición, estado, contraseña y eliminación | Escalación de privilegios, exposición de hashes y modificación de otros usuarios |
| Inventario | Inventario, resumen, productos y lotes por sucursal | Acceso entre sucursales, manipulación de identificadores y exposición de información |
| Ventas | Creación, consulta, pagos, anulación y eliminación | Alteración de montos, repetición de operaciones y acceso a ventas ajenas |
| Caja | Cajas, sesiones, movimientos, cierres y resumen diario | Operaciones fuera de rol, acceso entre sucursales y repetición de cierres |
| Reportes | Ventas, métodos de pago, productos y rentabilidad | Acceso a datos financieros, filtros manipulados y exposición entre sucursales |
| Catálogos | Categorías, ciudades, presentaciones, casas y proveedores | Operaciones administrativas sin autorización e inyección en entradas |
| Webhook de pagos | Confirmación de pagos recurrentes | Firma inválida, repetición, cuerpo alterado y marcas de tiempo vencidas |

Los endpoints de laboratorios, expedientes y visitas se incorporarán cuando
sus contratos estén integrados en `develop`. La búsqueda de pacientes podrá
incorporarse después de confirmar su política de aislamiento. Esta espera no
bloquea la infraestructura ni el análisis de los módulos actuales.

## Fuera de alcance

- Ingeniería social, phishing o pruebas contra cuentas reales.
- Denegación de servicio deliberada mediante OWASP ZAP.
- Ataques a infraestructura que no pertenezca al ambiente autorizado.
- Descubrimiento o descifrado de contraseñas con datos de producción.
- Escaneo activo de producción.
- Modificaciones funcionales para corregir hallazgos dentro de la rama de
  pruebas. Las mitigaciones se implementarán en ramas separadas.

## Ambientes autorizados

1. **Local:** ambiente principal para análisis pasivo y activo. Debe usar datos
   ficticios y poder restablecerse completamente.
2. **Staging:** podrá utilizarse para confirmar resultados cuando exista
   autorización del equipo y un mecanismo de restauración.
3. **Producción:** solo podrá recibir análisis pasivo expresamente autorizado.
   El análisis activo queda prohibido.

Antes de un análisis activo se debe:

- confirmar la URL objetivo;
- comprobar que no sea producción;
- usar credenciales exclusivas para pruebas;
- preparar o respaldar los datos ficticios;
- limitar la duración y la intensidad del escaneo;
- excluir operaciones destructivas que no puedan revertirse.

## Roles y política de acceso

La matriz definitiva será una política explícita y no una copia automática de
los middlewares actuales. Cada celda deberá indicar una de estas decisiones:

- `PERMITIR`: la operación forma parte de las responsabilidades del rol;
- `DENEGAR`: un usuario autenticado debe recibir `403`;
- `PROPIO`: solo se permiten recursos asociados a su sucursal o laboratorio;
- `NO APLICA`: la operación no corresponde al rol.

La política inicial que debe confirmarse con el equipo es:

| Capacidad | Dueño | Administrador | Dependiente | Laboratorista |
|---|---:|---:|---:|---:|
| Administrar usuarios y roles | PERMITIR | Limitado | DENEGAR | DENEGAR |
| Consultar reportes financieros | PERMITIR | PERMITIR | DENEGAR | DENEGAR |
| Administrar cajas | PERMITIR | PERMITIR | DENEGAR | DENEGAR |
| Operar una sesión de caja | PERMITIR | PERMITIR | PROPIO | DENEGAR |
| Consultar inventario de farmacia | PERMITIR | PERMITIR | PROPIO | DENEGAR |
| Registrar ventas | PERMITIR | PERMITIR | PROPIO | DENEGAR |
| Administrar catálogos | PERMITIR | PERMITIR | Por confirmar | DENEGAR |
| Consultar pacientes y expedientes | Por confirmar | Por confirmar | DENEGAR | PROPIO |
| Administrar laboratorios | PERMITIR | PERMITIR | DENEGAR | DENEGAR |

Los casos marcados como `Limitado` o `Por confirmar` no se convertirán en
assertions automáticas hasta definir la operación exacta. Esto evita aceptar
como política un comportamiento potencialmente inseguro del código actual.

## Casos mínimos de autenticación

- Solicitud protegida sin cookie: `401`.
- Cookie vacía, alterada, mal firmada o expirada: `401`.
- Cuenta inexistente o sesión invalidada por cambio de versión: `401`.
- Cuenta inactiva con token previamente válido: `403`.
- Credenciales incorrectas: respuesta genérica sin revelar si el correo existe.
- Límite de intentos fallidos: bloqueo después del máximo configurado y
  presencia de encabezados estándar de rate limiting.
- Cierre de sesión: eliminación de la cookie e invalidación de la sesión.
- Cookie de autenticación: `HttpOnly`, `SameSite=Strict`, ruta `/` y `Secure`
  cuando el ambiente sea de producción.

## Categorías de análisis

El inventario de pruebas se organizará con referencia a OWASP API Security:

- autenticación rota;
- autorización rota a nivel de objeto y de función;
- consumo no restringido de recursos;
- exposición de propiedades o información sensible;
- inyección SQL, XSS y manipulación de rutas;
- configuración insegura de CORS, cookies y encabezados HTTP;
- inventario incompleto de endpoints;
- consumo inseguro de webhooks y servicios externos.

Una respuesta `200` no será suficiente para aprobar un caso. También se
validará el esquema básico, la ausencia de datos sensibles, el recurso devuelto
y su pertenencia a la sucursal o laboratorio esperado.

## Criterios de aceptación

- El 100 % de los casos definidos como `DENEGAR` debe ser rechazado.
- El 100 % de los endpoints protegidos debe rechazar una solicitud sin sesión.
- Todos los endpoints incluidos en el contrato de prueba deben recibir al menos
  una solicitud válida para alimentar el análisis pasivo.
- No puede quedar ninguna alerta de severidad alta sin mitigar o sin una
  aceptación de riesgo explícita.
- Las alertas medias deben ser revisadas individualmente y convertirse en una
  mitigación, una aceptación de riesgo o un falso positivo documentado.
- Las exclusiones de reglas deben incluir justificación y evidencia.
- Las ejecuciones deben registrar fecha, commit, versión de ZAP, ambiente,
  usuario de prueba, cobertura y duración.
- Los reportes versionados no deben contener contraseñas, cookies, tokens,
  firmas de webhooks ni datos personales reales.
- Una reevaluación debe demostrar el cierre de cada vulnerabilidad mitigada.

Los criterios anteriores son controles del sprint. No sustituyen requisitos
que necesitan observación prolongada, como la disponibilidad del 99 %, ni las
pruebas de respaldo y recuperación necesarias para demostrar integridad de
datos.

## Clasificación de hallazgos

Cada hallazgo debe documentar:

| Campo | Descripción |
|---|---|
| Identificador | Código estable para relacionar ejecución, tarea y reevaluación |
| Severidad | Crítica, alta, media, baja o informativa |
| Confianza | Confirmada, alta, media o baja |
| Activo afectado | Módulo, método y ruta sin datos sensibles |
| Evidencia | Solicitud y respuesta sanitizadas |
| Impacto | Consecuencia técnica y de negocio para FarmaCom |
| Referencia | CWE y categoría OWASP aplicable |
| Mitigación | Cambio concreto recomendado |
| Responsable | Persona asignada a la corrección |
| Estado | Abierto, en mitigación, aceptado, falso positivo o corregido |
| Reevaluación | Fecha, commit y resultado de la prueba posterior |

La severidad de ZAP será un insumo, no la decisión final. La clasificación debe
considerar la exposición del endpoint, los privilegios necesarios, los datos
afectados y la posibilidad de alterar inventario, ventas, caja o información de
pacientes.

## Evidencias y secretos

Los planes, contratos, scripts y resúmenes sanitizados sí se versionarán. Las
credenciales, cookies y reportes sin revisar permanecerán fuera de Git. Los
archivos de resultados que se entreguen deben ocultar:

- contraseñas y hashes;
- valores completos de cookies o tokens;
- secretos de firma;
- correos y datos personales que no sean ficticios;
- cadenas de conexión y variables privadas.

La configuración local utilizará un archivo de ejemplo sin secretos. El archivo
real deberá estar ignorado por Git.

## Flujo de ejecución previsto

1. Validar la configuración y el ambiente objetivo.
2. Importar el contrato OpenAPI de la API.
3. Autenticar los perfiles requeridos y comprobar que la sesión funciona.
4. Ejecutar las solicitudes válidas de cada módulo para obtener cobertura.
5. Ejecutar la matriz negativa de autenticación y autorización.
6. Esperar a que termine el análisis pasivo.
7. Ejecutar el análisis activo únicamente en el ambiente autorizado.
8. Generar reportes, sanitizarlos y clasificar los hallazgos.
9. Crear tareas de mitigación y ejecutar nuevamente los casos corregidos.
