# Patrones de interfaz del frontend

Esta guía es la fuente de verdad para crear o rediseñar pantallas de FarmaCom. Su objetivo es que tablas, formularios, diálogos y estados asíncronos se comporten igual en todos los módulos, con soporte completo de teclado y tecnologías de asistencia.

## Fundamentos compartidos

- Los tokens de color viven en `frontend/src/index.css` con el prefijo `--ui-*`.
- El contenedor visual de una página vive en `PageShell.module.css`; `ManagementUI.module.css` y `ReportsUI.module.css` lo componen en su clase `page`.
- Los estilos específicos de un dominio permanecen en su módulo (`ManagementUI`, `LaboratoryUI` o `ReportsUI`). No se deben copiar colores, bordes o estructura de página entre módulos.
- Los controles interactivos deben tener un objetivo mínimo de 24 px y de 44 px en móvil, foco visible con `:focus-visible` y `touch-action: manipulation`.
- Toda animación debe usar `opacity` o `transform` y respetar `prefers-reduced-motion`.

Estructura base de una página:

```jsx
<main className={styles.page} aria-labelledby="titulo-pagina">
  <header className={styles.heading}>
    <div>
      <h1 id="titulo-pagina">Título</h1>
      <p>Descripción breve de la tarea disponible.</p>
    </div>
  </header>
  {/* filtros, contenido y estados */}
</main>
```

La página debe actualizar `document.title`, mantener un único `h1` y usar enlaces reales para navegación. Los filtros, pestañas y paginación que el usuario pueda compartir deben reflejarse en la URL.

## Tablas

Las tablas se reservan para datos tabulares; no deben construirse con `div`. Reglas:

- Incluir `caption`; puede ser visualmente oculto si el título inmediato ya aporta contexto.
- Usar `scope="col"` en encabezados y `scope="row"` cuando la primera celda identifica la fila.
- Alinear números a la derecha y aplicar `font-variant-numeric: tabular-nums`.
- Conservar encabezados comprensibles en móvil mediante `data-label` o permitir desplazamiento horizontal deliberado.
- Las acciones deben ser botones con nombre accesible. Navegar al detalle debe usar `Link`.
- No montar una tabla vacía. Mostrar `ContentState` antes o después del encabezado de la sección.
- Para más de 50 filas, usar paginación o virtualización.

Orden recomendado de estados:

```jsx
{cargando ? (
  <SkeletonTabla />
) : error ? (
  <ContentState variant="error" message={error} onRetry={recargar} />
) : filas.length === 0 ? (
  <ContentState title="Sin resultados" message="Prueba otros filtros." />
) : (
  <Tabla filas={filas} />
)}
```

Si una actualización conserva datos anteriores, no se debe desmontar la tabla. Se mantiene visible con `aria-busy="true"` y un indicador discreto dentro de su panel.

## Paginación de listados

Inventario establece el patrón de paginación en el servidor. Su tabla recibe únicamente
las filas de la página actual; no se debe aplicar otro `slice` ni filtrar estas filas
en el navegador. Los filtros se aplican antes del conteo y de `LIMIT/OFFSET` en el DAO.

### Contrato de referencia

`GET /api/sucursales/:id_sucursal/inventario?pagina=1&limite=25`

```json
{
  "datos": [],
  "paginacion": { "pagina": 1, "limite": 25, "total": 0, "total_paginas": 1 }
}
```

- `pagina`: entero entre 1 y 2147483647. En este endpoint activa el modo paginado.
- `limite`: entero entre 1 y 100; predeterminado 25. La interfaz ofrece 10, 25 y 50.
- `busqueda`: hasta 150 caracteres, espacios exteriores recortados. Busca subcadenas
  literales en código, nombre comercial y genérico, sin distinguir mayúsculas. Las
  tildes siguen siendo significativas; `%` y `_` no son comodines.
- Filtros combinables con AND: `id_categoria`, `activo` (`true` o `false`),
  `estado_stock` y `estado_vencimiento`. Sus valores están definidos en OpenAPI.
- Parámetros inválidos devuelven 400 antes de consultar la base. No se admiten arreglos
  ni objetos en estos parámetros. Se mantienen autenticación y permisos por sucursal.
- `total` cuenta todos los resultados filtrados. El orden conserva prioridad de
  alertas, nombre comercial y un desempate por `id_producto`. No es una instantánea:
  las modificaciones del inventario pueden cambiar la posición entre consultas.
- Una página superior al máximo devuelve la última página efectiva. Sin resultados
  devuelve `datos: []`, `total: 0`, `pagina: 1` y `total_paginas: 1`.

Por compatibilidad, **sin `pagina` este endpoint conserva el arreglo completo** que
consume `useCatalogoPOS`; los filtros de listado no se aplican en ese modo. Esta
excepción es temporal y específica de inventario. No se debe cambiar el contrato
de los demás módulos hasta migrar sus consumidores. Pacientes ya tiene su propio
endpoint paginado y comparte la forma de los metadatos.

### Componente y estado de navegación

`components/ui/Paginacion.jsx` recibe `paginacion`, `crearDestino(pagina)`,
`onLimiteChange(limite)`, `cargando`, `sustantivo`, `etiqueta` y `controles` (el ID
del listado). Su estilo usa las variables de inventario con valores de respaldo.
Se integra con `react-router-dom`, sin depender del hook ni del endpoint de inventario.

```jsx
<Paginacion
  paginacion={paginacion}
  crearDestino={crearDestino}
  onLimiteChange={(limite) => actualizarVista({ limite })}
  cargando={cargando}
  sustantivo="productos"
  etiqueta="Paginación de inventario"
  controles="listado-inventario"
/>
```

- Inventario conserva `pagina`, `limite`, `q`, `sucursal` y filtros en la URL.
  `q` se envía al backend como `busqueda`. Los cambios de criterios regresan a página 1;
  los enlaces anterior/siguiente conservan el resto de parámetros.
- Recargar o abrir un enlace debe reproducir la consulta. Atrás/Adelante restaura
  los parámetros; el scroll se restaura dentro de la instancia del listado después
  de recibir los resultados. No se persiste el scroll al cerrar la pantalla.
- El hook aplica una pausa de 300 ms a los cambios de búsqueda y cancela peticiones
  anteriores. Una respuesta tardía no debe sobrescribir datos ni corregir una URL nueva.
- Al corregir una página fuera de rango, se reemplaza la URL sin agregar una entrada
  al historial. Los metadatos usados deben pertenecer a la consulta vigente.
- El resumen es global por sucursal: no depende de página, búsqueda ni filtros.
  Se consulta al cambiar sucursal y al refrescar después de una mutación; sus errores
  no impiden mostrar el listado, ni los errores del listado ocultan el resumen.
- Después de crear o editar productos, cambiar su estado o ingresar lotes, se refrescan
  listado y resumen. El servidor vuelve a resolver la página disponible.

### Verificación al adoptar el patrón

Cada nuevo listado debe probar filtros combinados, varias páginas sin duplicados en
un conjunto estable, estado vacío, parámetros inválidos, permisos, respuestas tardías,
errores con reintento, navegación y refresco tras mutaciones. Antes de retirar un
contrato anterior se deben identificar sus consumidores, incluidos selectores y POS.

Para inventario: `npm --prefix backend test -- --runInBand Inventario paginacion`,
`npm --prefix backend run test:integration -- --testPathPatterns=api.integration`,
`npm --prefix frontend test -- Inventario useInventarioSucursal Paginacion useCatalogoPOS`
y `npm --prefix frontend run build`.
Integración requiere una base de pruebas cuyo nombre incluya `integration`; nunca
debe apuntar a la base de desarrollo. Las credenciales se configuran con las variables
que utiliza `backend/tests/integration/setup-env.js`.

La pantalla todavía carga el catálogo de `/productos` para formularios y código
sugerido. Paginar inventario reduce el listado y sus consultas, pero no elimina esa
descarga ni migra lotes e historiales.

## Formularios

- Cada control debe tener `label`, `name`, `autocomplete` y el `type`/`inputMode` correspondiente.
- Los placeholders terminan en `…` y sirven como ejemplo, no como sustituto de la etiqueta.
- Los errores se muestran junto al campo, con `aria-invalid="true"` y `aria-describedby` apuntando al mensaje.
- Al enviar, se valida el formulario completo y se enfoca el primer campo inválido.
- El botón permanece habilitado hasta iniciar la petición. Durante la petición conserva su texto, muestra un indicador y queda deshabilitado.
- Nunca se bloquea pegar texto ni escribir valores incompletos.
- En móvil, los campos usan al menos 16 px para evitar zoom automático.
- Los selectores de fecha se abren al pulsar cualquier parte del control; la utilidad compartida es `utils/datePicker.js`.
- Se debe advertir antes de abandonar un formulario con cambios sin guardar.

Ejemplo de error de campo:

```jsx
<label htmlFor="correo">Correo</label>
<input
  id="correo"
  name="correo"
  type="email"
  autoComplete="email"
  aria-invalid={Boolean(errores.correo)}
  aria-describedby={errores.correo ? 'correo-error' : undefined}
/>
{errores.correo && <p id="correo-error">{errores.correo}</p>}
```

## Modales y diálogos

`AccessibleDialog` es el núcleo único para diálogos. `Modal` es una capa de compatibilidad visual que también delega en ese núcleo. Un modal debe:

- Tener `aria-labelledby`; agregar `aria-describedby` cuando exista una explicación o advertencia.
- Mover el foco al primer error, primer campo o primera acción al abrirse.
- Encerrar `Tab` y `Shift+Tab` dentro del diálogo.
- Cerrar con `Escape` cuando no haya una operación en curso.
- Restaurar el foco al control que lo abrió.
- Marcar el resto de la aplicación como `inert`, bloquear el scroll del fondo y usar `overscroll-behavior: contain`.
- Mantener disponible un botón “Cerrar” con nombre accesible y objetivo táctil suficiente.

Uso recomendado:

```jsx
<AccessibleDialog
  open={abierto}
  labelledBy="modal-titulo"
  describedBy="modal-descripcion"
  onClose={cerrar}
  busy={guardando}
  size="medium"
>
  <h2 id="modal-titulo">Editar registro</h2>
  <p id="modal-descripcion">Actualiza los datos necesarios.</p>
  <form>{/* campos y acciones */}</form>
</AccessibleDialog>
```

No se deben implementar portales, listeners de teclado o trampas de foco dentro de cada formulario.

## Estados de carga, error y vacío

El componente compartido es `ContentState`:

| Estado | Variante | Semántica | Contenido esperado |
| --- | --- | --- | --- |
| Carga general | `loading` | `role="status"`, `aria-busy` | Acción que está ocurriendo, terminada en `…` |
| Error recuperable | `error` | `role="alert"` | Mensaje claro y botón “Reintentar” |
| Vacío | `empty` | `role="status"` | Qué falta y el siguiente paso posible |

```jsx
<ContentState variant="loading" message="Cargando pacientes…" />
<ContentState variant="error" message={error} onRetry={recargar} />
<ContentState title="Sin pacientes" message="Crea el primer paciente para comenzar." />
```

Cuando se conoce la forma final del contenido, se prefiere un skeleton con las mismas dimensiones para evitar cambios de layout. El indicador animado debe detenerse con `prefers-reduced-motion`.

## Lista de verificación

- Probar solo con teclado: abrir, recorrer, enviar, cerrar y regresar al disparador.
- Probar estados cargando, error, vacío, pocos datos y contenido largo.
- Verificar móvil, laptop y ancho ultra-wide.
- Confirmar foco visible, nombres accesibles y orden jerárquico de títulos.
- Ejecutar pruebas unitarias, cobertura y compilación antes de integrar.
