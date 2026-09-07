# Pruebas de rendimiento de FarmaCom

Este directorio contiene las pruebas de carga y estrés ejecutadas con Grafana k6. La prueba de humo comprueba primero que k6 puede autenticarse mediante la cookie `auth_token` y consultar una ruta protegida.

## Requisitos

- Docker Desktop en ejecución.
- Una base de datos local con un usuario ficticio activo.
- El usuario debe tener acceso a la sucursal configurada.

## Configuración inicial

Desde la raíz del repositorio, crea el archivo local de configuración:

```powershell
Copy-Item tests/performance/.env.performance.example tests/performance/.env.performance
```

Edita `.env.performance` y reemplaza el correo, la contraseña y los identificadores de sucursal. `K6_BRANCH_ID` se utiliza en la prueba de humo y `K6_BRANCH_IDS` distribuye las pruebas de carga y estrés. Este archivo está ignorado por Git y no debe contener datos de producción.

## Preparar tres sucursales ficticias

Antes de las pruebas representativas, prepara los datos locales con:

```powershell
docker compose --env-file .env -f docker-compose.yml -f docker-compose.k6.yml --profile performance run --rm performance-data
```

El proceso prepara `Sucursal 1`, `Sucursal 2` y `Sucursal 3`, asociadas a ciudades y direcciones completamente ficticias. Cada una queda con una caja principal y tres lotes ficticios de 500 unidades. La ejecución muestra los identificadores generados de las sucursales, cajas y lotes para configurar los escenarios posteriores.

El script es idempotente: puede ejecutarse nuevamente sin duplicar sucursales, cajas ni lotes. No restablece las existencias consumidas por pruebas transaccionales anteriores.

## Ejecutar la prueba de humo

```powershell
docker compose --env-file .env --env-file tests/performance/.env.performance -f docker-compose.yml -f docker-compose.k6.yml --profile performance run --rm k6-smoke
```

La ejecución realiza tres solicitudes:

1. Inicia sesión mediante `POST /api/auth/login`.
2. Verifica la sesión mediante `GET /api/auth/me`.
3. Consulta el inventario mediante `GET /api/sucursales/:id/inventario`.

El reporte HTML se genera en `tests/performance/results/smoke.html`. Los reportes y las credenciales locales no se incluyen en Git.

## Criterios de la prueba de humo

- Todas las comprobaciones deben ser satisfactorias.
- No debe existir ninguna solicitud HTTP fallida.
- El percentil 95 del tiempo de respuesta debe ser menor a 2 segundos.

La prueba de humo no crea ventas ni modifica el inventario.

## Ejecutar la carga de consultas

```powershell
docker compose --env-file .env --env-file tests/performance/.env.performance -f docker-compose.yml -f docker-compose.k6.yml --profile performance run --rm k6-load-queries
```

La prueba distribuye seis usuarios virtuales de esta forma:

- Tres usuarios consultan el catálogo del punto de venta, inventario y cajas; cada uno queda asociado a una sucursal distinta.
- Dos usuarios consultan clientes, productos y el resumen de inventario de la sucursal que les corresponde.
- Un usuario consulta indicadores consolidados de las tres sucursales.

Los usuarios aumentan gradualmente durante 30 segundos, mantienen la carga durante cuatro minutos y descienden durante 30 segundos. Las cantidades y duraciones pueden modificarse en `.env.performance`.

### Criterios de carga

- Más del 98 % de las comprobaciones debe ser satisfactorio.
- La tasa de solicitudes HTTP fallidas debe ser menor al 2 %.
- El percentil 95 de las consultas debe ser menor a 2 segundos.
- El percentil 95 de los reportes debe ser menor a 3 segundos.
- El percentil 95 de las búsquedas de medicamentos debe ser menor a 5 segundos.

El reporte se genera en `tests/performance/results/load-queries.html`. Este escenario solo realiza consultas y no modifica la base de datos.

## Ejecutar la prueba de estrés

```powershell
docker compose --env-file .env --env-file tests/performance/.env.performance -f docker-compose.yml -f docker-compose.k6.yml --profile performance run --rm k6-stress
```

El escenario aumenta progresivamente la cantidad de usuarios virtuales:

1. Inicia con un usuario durante el calentamiento.
2. Aumenta aproximadamente al 25 %, 50 %, 75 % y 100 % del máximo configurado.
3. Mantiene brevemente la carga máxima de 20 usuarios.
4. Reduce la carga a 3 usuarios para observar la recuperación.
5. Finaliza reduciendo la carga a 0.

Cada usuario se distribuye de forma estable entre las tres sucursales. Cada iteración consulta simultáneamente el autocompletado del POS, el inventario de su sucursal, clientes y dos reportes consolidados. La prueba es de solo lectura.

### Criterios de estrés

- Más del 95 % de las comprobaciones debe ser satisfactorio.
- La tasa de solicitudes HTTP fallidas debe ser menor al 5 %.
- El percentil 95 general debe mantenerse por debajo de 5 segundos.
- El sistema debe continuar disponible y recuperar sus tiempos al disminuir la carga.

El reporte se genera en `tests/performance/results/stress.html`. La gráfica temporal debe utilizarse para identificar la degradación durante el pico y la recuperación posterior.

## Ejecutar ventas controladas

Este escenario es opcional y modifica el inventario local. Antes de utilizarlo, configura en `.env.performance` un lote vigente con existencias suficientes y habilita las escrituras de forma consciente:

```dotenv
K6_TARGET_ENV=local
K6_ALLOW_WRITES=true
K6_SALES_CASES=1:15
```

Cada par de `K6_SALES_CASES` representa una caja virtual mediante `id_sucursal:id_lote`. Para simular las tres cajas de sucursales diferentes se puede usar, por ejemplo, `1:15,2:28,3:41`. Si varias cajas consumen el mismo lote, repite el par; la prevalidación calculará las existencias necesarias para todas.

Ejecuta la prueba con:

```powershell
docker compose --env-file .env --env-file tests/performance/.env.performance -f docker-compose.yml -f docker-compose.k6.yml --profile performance run --rm k6-transactional-sales
```

De forma predeterminada, cada caja virtual realiza tres ventas de una unidad. Antes de crear la primera venta, k6 comprueba que cada lote pertenezca a su sucursal, no esté vencido, tenga precio válido y posea existencias para completar todas las iteraciones.

### Criterios de ventas controladas

- Más del 98 % de las comprobaciones debe ser satisfactorio.
- La tasa de solicitudes HTTP fallidas debe ser menor al 2 %.
- El percentil 95 de la creación de ventas debe ser menor a 2 segundos.
- Cada venta debe devolver su identificador, sucursal y detalle correctos.
- El inventario nunca debe quedar con existencias negativas.

El escenario se bloquea si `K6_ALLOW_WRITES` no es `true`, si `K6_TARGET_ENV` no es `local` o si `K6_API_URL` no apunta a `backend`, `localhost`, `127.0.0.1` o `host.docker.internal`. Debe ejecutarse solo con datos ficticios; no utilices credenciales ni inventario de producción. El reporte se genera en `tests/performance/results/transactional-sales.html`.
