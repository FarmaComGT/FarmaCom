# Migraciones versionadas

Este directorio contiene únicamente los cambios de base de datos que deben
aplicarse automáticamente a instalaciones existentes. Los archivos SQL que se
encuentran en el directorio padre son migraciones históricas y no son leídos
por el ejecutor nuevo.

## Responsabilidad

La persona responsable de una funcionalidad que modifica el esquema también
debe entregar su migración. La tarea de infraestructura proporciona el
ejecutor, valida la convención y comprueba la migración en CI, pero no sustituye
el diseño de datos de cada funcionalidad.

## Nombres y orden

Los archivos deben usar tres dígitos, letras minúsculas y guiones bajos:

```text
001_precio_compra_por_lote.sql
002_contactos_cliente.sql
003_ajustes_cancelacion_venta.sql
```

Antes de crear un archivo, se debe revisar el último número disponible. Una
migración que ya fue aplicada no se renombra ni se modifica; cualquier
corrección se agrega en un archivo nuevo.

## Reglas

- No incluir `BEGIN`, `COMMIT` ni `ROLLBACK`; el ejecutor controla la
  transacción completa.
- Preservar los datos existentes y completar cualquier valor requerido antes
  de agregar una restricción `NOT NULL`.
- Evitar eliminaciones de columnas o tablas en el mismo despliegue que deja de
  utilizarlas. Primero se despliega el código compatible y la eliminación se
  realiza en una migración posterior.
- No agregar usuarios, productos, pacientes ni otros datos de demostración.
- Los catálogos indispensables para que la aplicación funcione pueden formar
  parte de una migración si utilizan identificadores estables y no sobrescriben
  datos administrados por usuarios.
- Usar nombres explícitos para restricciones e índices.
- Verificar vistas, funciones, llaves foráneas e índices afectados por el
  cambio.

## Plantilla

La plantilla `migracion.sql.example` sirve como punto de partida. Su extensión
evita que el ejecutor intente aplicarla. Debe copiarse con el siguiente número
disponible y un nombre descriptivo.

## Comprobación local

Con las variables de PostgreSQL configuradas:

```bash
npm run db:migrate
npm run db:migrate
```

La primera ejecución debe aplicar la migración. La segunda debe indicar que la
base de datos ya está actualizada. Después se comprueba que los datos anteriores
continúan disponibles y que la funcionalidad utiliza el esquema nuevo.

## Lista de revisión para el PR

- [ ] El archivo utiliza el siguiente número disponible.
- [ ] La migración se ejecutó sobre una base con datos existentes.
- [ ] Los datos se conservaron o transformaron explícitamente.
- [ ] Una segunda ejecución del migrador no repite cambios.
- [ ] Las pruebas de integración relacionadas están aprobadas.
- [ ] No se incluyeron datos de demostración ni credenciales.
