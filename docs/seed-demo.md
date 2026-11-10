# Demo final: Baja Verapaz

La demo representa sucursales en Salamá, San Jerónimo y Rabinal. Personas,
contactos, nombres comerciales, distribuidores y casas farmacéuticas son ficticios. Los precios en
quetzales son ilustrativos; no representan cotizaciones ni indicaciones médicas.
Se omiten DPI y NIT para evitar aparentar identidades fiscales reales.

## Volumen y rendimiento

| Datos | Cantidad |
| --- | ---: |
| Sucursales / cajas | 3 / 3 |
| Usuarios activos / usuario técnico inactivo | 8 / 1 |
| Productos / categorías | 40 / 8 |
| Lotes | 240 |
| Clientes | 60 |
| Pacientes / expedientes / visitas | 30 / 30 / 60 |
| Días históricos completos | 60 |
| Tickets, incluidos los de hoy | 2,358 |
| Detalles de venta / movimientos de inventario | 4,716 / 5,218 |
| Sesiones cerradas / abiertas | 180 / 3 |
| Promociones vigentes / programadas | 6 / 3 |

Salamá tiene más ventas que las otras sucursales. Cada ticket lleva entre uno y
tres productos; aproximadamente 80 % se paga en efectivo y 20 % con tarjeta.
Hay consumidor final, clientes recurrentes y anulaciones. Los cobros de tarjeta
son registros históricos sintéticos (`proveedor_pago=terminal`), sin llamadas a POS.

El stock incluye agotados, pocas existencias, lotes vencidos y próximos a vencer.
El kárdex registra ingresos, ventas, devoluciones por anulación y ajustes por
conteo; sus saldos concuerdan con cada lote. Los cierres reflejan ventas netas y
salidas de mensajería. Hay precios de mayoreo para blísteres y sobres.

El volumen es fijo: no crece con el tiempo transcurrido ni con cada arranque.
La generación usa operaciones SQL por conjuntos, tablas temporales y una sola
transacción, sin solicitudes HTTP por registro. Sólo se calculan cuatro hashes
bcrypt para las cuentas de demo. Las pruebas de integración imprimen el tiempo
total de carga, incluido bcrypt; ese valor depende del servidor y no garantiza
latencia de navegación ni capacidad de usuarios simultáneos. Esto es una demo
de tres sucursales, no una prueba de concurrencia de usuarios.

Medición de referencia en PostgreSQL 18 local: **937 ms** para la carga completa
con bcrypt a costo 10 y **4,720 kB** de tablas e índices del esquema completo
tras la carga (base total: 14 MB, incluidos catálogos y extensiones). Docker
Compose usa PostgreSQL 16; esta medición no se realizó dentro de ese contenedor.

## Cargar

Usar una base **exclusiva de demo**, vacía, con el esquema y las migraciones
aplicados. Si ya existe la demo antigua, conservarla y crear otra base; el seed
rechaza mezclar información y no borra tablas ni volúmenes. Revisar `DB_HOST`,
`DB_PORT` y `POSTGRES_DB` antes de ejecutar. Desde PowerShell, con las variables
de conexión y las cuatro claves definidas en el entorno o en `.env`:

```powershell
$env:NODE_ENV = 'development'
npm --prefix backend run db:migrate
npm --prefix backend run db:seed:demo
```

También sigue funcionando el servicio `seed` de Docker Compose, que se ejecuta
automáticamente sólo con `NODE_ENV=development`. El runner admite `development`
y `test`; conserva el bloqueo en `production`. Para una presentación alojada,
usar una instancia de demo separada; este cambio no habilita seeds en producción.

Definir `DEMO_DUENO_PASSWORD`, `DEMO_LABORATORISTA_PASSWORD`,
`DEMO_ADMINISTRADOR_PASSWORD` y `DEMO_DEPENDIENTE_PASSWORD`: cuatro claves
diferentes, de al menos 12 caracteres y máximo 72 bytes UTF-8. No se incluyen
claves predeterminadas ni se imprimen en logs.

| Rol | Correo | Clave del entorno |
| --- | --- | --- |
| Dueña | `dueno@farma.com` | `DEMO_DUENO_PASSWORD` |
| Laboratorista, Salamá | `laboratorista@farma.com` | `DEMO_LABORATORISTA_PASSWORD` |
| Administradores | `admin.1@farmacom.example` a `admin.3@farmacom.example` | `DEMO_ADMINISTRADOR_PASSWORD` |
| Dependientes | `caja.1@farmacom.example` a `caja.3@farmacom.example` | `DEMO_DEPENDIENTE_PASSWORD` |

Los números 1, 2 y 3 corresponden a Salamá, San Jerónimo y Rabinal. Las cuentas
por sucursal permiten ingresar simultáneamente sin compartir una misma sesión.
Las cuentas del mismo rol comparten clave sólo para facilitar esta demo.

## Repetición y fechas

La marca `baja-verapaz-v1` en `seed_demo_ejecucion` evita duplicados, incluso en
dos ejecuciones simultáneas. Repetir el comando conserva también los cambios
hechos durante la presentación; no reinicia contraseñas, stock ni ventas.
No eliminar esa marca para forzar la recarga.

Al repetir el comando sobre una carga anterior, se aplica una única corrección
de presentación (`baja-verapaz-contenido-v2`): nombres comerciales separados de
los genéricos, 60 nombres de clientes variados y eliminación de etiquetas de
demostración en los datos. También se actualizan los nombres históricos de los
productos, conservando importes, existencias, fechas y claves. No requiere una
base nueva ni variables adicionales en `.env`.

Las fechas se calculan una vez según `America/Guatemala`. Hay seis tickets por
sucursal al comienzo del día de carga y una caja abierta por sucursal para
continuar vendiendo. Si la presentación se hace otro día, se deberán cerrar las
sesiones anteriores y abrir las del día desde el sistema, o cargar una base
nueva para renovar todo el escenario. No se crean filas de resultados PDF sin
archivos: los 30 expedientes quedan listos para demostrar la subida real.

## Verificar sin tocar la base de trabajo

Crear una base desechable vacía cuyo nombre termine en `_seed_test`, con
permisos para instalar las extensiones del esquema. No reutilizar la base de la
aplicación. La prueba deja los datos disponibles para inspección:

```powershell
$env:SEED_DEMO_TEST_URL = 'postgresql://usuario:clave@localhost:5432/farmacom_seed_test'
npm --prefix backend run test:integration -- --runTestsByPath tests/integration/seedDemo.test.js
npm --prefix backend test -- --runInBand src/database/seedDemo.test.js
```

Se verifican volumen, integridad de tickets, sucursales, horarios, cierres,
continuidad del kárdex, saldos finales, repetición concurrente y rechazo de
mezclas. Sin `SEED_DEMO_TEST_URL`, la suite PostgreSQL se omite.
