# FarmaCom — propuesta de rediseño

**Estado: preliminar, pendiente de validación del equipo.**

Este documento registra la propuesta implementada para evaluar el rediseño de FarmaCom, el sistema de gestión de Farmacia San Gabriel. No constituye una identidad visual definitiva ni una orden de migrar todas las pantallas. Las decisiones visuales pueden cambiar según las pruebas y la revisión del equipo.

## Objetivo y alcance

Reducir la carga visual y facilitar las tareas diarias: encontrar productos, consultar existencias por sucursal y reconocer problemas de stock o vencimiento.

La prueba actual incluye la navegación compartida (sidebar y navbar) y la pantalla principal de inventario. Los formularios de producto y lote, el detalle de lotes y las demás pantallas conservan su diseño anterior. La convivencia de estilos es temporal.

## Principios de trabajo

- Dar prioridad a la información y a las acciones frecuentes.
- Agrupar datos relacionados antes de añadir columnas o contenedores.
- Usar color para comunicar riesgo y selección, con texto que explique el estado.
- Mantener la identidad de San Gabriel mediante tipografía y color, sin decoración médica genérica.
- Conservar los flujos, permisos y reglas de negocio al modificar la presentación.
- Validar las propuestas en el navegador con datos vacíos, habituales y extensos.

## Dirección visual en evaluación

Un marco verde grisáceo contiene la navegación; el trabajo se realiza sobre una hoja blanca. Las superficies se separan por tono o bordes discretos. La tabla tiene más peso que los resúmenes y las acciones secundarias.

### Tipografía

| Uso | Propuesta actual |
| --- | --- |
| Interfaz, navegación y tablas | Public Sans (alternativa en comparación) |
| Nombre FarmaCom en la sidebar | Public Sans, 22 px, peso 700, espaciado −0,025 em |
| Título de inventario | 24 px, peso 600 |
| Información y controles | Principalmente 13–14 px |
| Datos secundarios | Principalmente 12 px |
| Cifras comparables | Numerales tabulares y alineación derecha |

La marca en la sidebar muestra únicamente «FarmaCom» y «Farmacia San Gabriel». Se descartó el símbolo de la F en esta iteración. No agregar otro logo sin discutirlo con el equipo.

Public Sans es la alternativa actualmente aplicada para compararla con IBM Plex Sans y Source Sans 3, probadas en las iteraciones anteriores. Se mantienen tamaños, pesos y colores para evaluar la familia sin mezclar otros cambios. Inter se descartó por preferencia del equipo. Public Sans también reemplaza a Manrope en la marca y los encabezados para unificar la tipografía; su jerarquía se distingue por tamaño y peso. No hay una elección definitiva; validar lectura de tildes, cifras y nombres largos antes de extender los ajustes de escala. La familia de interfaz se define en `--font-sans` y la de marca y encabezados en `--font-headline`; los estilos locales deben referenciar esas variables.

### Colores

Los valores vigentes están en las variables CSS; esta tabla sirve como referencia de la propuesta.

| Función | Valor actual |
| --- | --- |
| Marco | `#f0f4f2` |
| Superficie de trabajo | `#ffffff` |
| Acento de San Gabriel | `#005147` |
| Texto principal de inventario | `#202b28` |
| Texto secundario de inventario | `#5c6863` |
| Riesgo: agotado o vencido | `#b42332` sobre `#ffefed` |
| Advertencia: poco stock o próximo a vencer | `#945600` sobre `#fff3d6` |

Los estados normales son neutros. Las alertas reciben texto más marcado y un fondo suave solo en sus etiquetas. Los recuentos de filtros permanecen sin cuadros ni fondos.

## Patrones implementados

### Navegación

- Sidebar agrupada en Operación y Administración, con destinos visibles según el rol.
- Subapartados de inventario en texto, sin repetir un icono en cada enlace.
- Iconos SVG propios inspirados en objetos del trabajo farmacéutico: estanterías, mostrador, cajón de caja, fichas y tubos de laboratorio. Comparten retícula de 24 unidades y trazo de 1,5 unidades.
- Chevrons junto a las etiquetas de los grupos, a aproximadamente 6 px.
- Navbar con ubicación actual, fecha localizada y datos de sesión.
- Navbar fija durante el desplazamiento para conservar el acceso al botón que abre la sidebar.
- En móvil, el menú se superpone, limita el foco a sus controles y devuelve el foco al disparador al cerrar. La posición de lectura se conserva.

### Inventario

- Filtros rápidos de texto con cantidades: Productos, Agotados, Poco stock, Vencidos y Próximos a vencer.
- Selección indicada mediante subrayado y peso tipográfico; no usar tarjetas para estos filtros.
- Stock y vencimiento se pueden combinar. No convertir la fila en pestañas de selección única.
- Los recuentos describen el inventario de la sucursal; el contador de resultados indica cuántos productos coinciden con los filtros. No sumar alertas, porque pueden solaparse.
- Búsqueda visible y filtros secundarios dentro de un desplegable.
- Nombre, genérico, concentración, código y presentación agrupados en la identidad del producto.
- Cantidad, mínimo y estado de stock juntos; vencimiento separado porque ambas alertas pueden coexistir.
- Nombre del producto como enlace al detalle de lotes; acciones secundarias en un menú por fila.
- Paginación de hasta 25 productos; filtros y página reflejados en la URL.
- En móvil, filas adaptadas a lista y desplazamiento horizontal limitado a los filtros rápidos.

## Criterios funcionales que se deben conservar

Estos criterios tienen prioridad sobre las preferencias visuales y se complementan con `AGENTS.md`:

- Navegación por teclado, foco visible y nombres accesibles para controles.
- Enlaces reales para navegar, conservando abrir en otra pestaña.
- Cursor de mano en botones y desplegables; estados deshabilitados identificables.
- Objetivos táctiles de al menos 44 px en móvil y campos con tamaño de texto adecuado.
- Elementos fijos que no oculten el foco ni los encabezados de tabla.
- Estados de carga, vacío y error con una acción de recuperación cuando corresponda.
- Fechas y cifras localizadas; cuidado con las tildes y la codificación UTF-8.
- Permisos existentes y confirmación de acciones destructivas.
- Respeto por la preferencia de movimiento reducido.

## Patrones que se busca evitar

- Tarjetas de métricas o filtros que ocupen más espacio que la tarea principal.
- Iconos repetidos dentro de cuadrados o círculos coloreados.
- Gradientes decorativos, glassmorphism, texturas médicas y sombras en cada contenedor.
- Colorear todos los estados, incluidas situaciones normales.
- Navegación duplicada o botones sin una función implementada.
- Textos genéricos, datos inventados o métricas que no ayuden a decidir.

Estas restricciones orientan esta propuesta; cualquier excepción debe tener una razón vinculada al uso del sistema.

## Referencias de implementación

| Archivo | Responsabilidad |
| --- | --- |
| `frontend/src/layouts/MainLayout.jsx` | Estructura, apertura del menú y manejo de foco |
| `frontend/src/layouts/Sidebar.jsx` | Grupos, destinos y visibilidad por rol |
| `frontend/src/layouts/TopNav.jsx` | Ubicación actual y sesión |
| `frontend/src/layouts/Navigation.css` | Variables y estilos compartidos de navegación |
| `frontend/src/components/navigation/NavigationIcon.jsx` | Iconografía propia de navegación |
| `frontend/src/pages/inventario/Inventario.jsx` | Integración, filtros y estado en URL |
| `frontend/src/pages/inventario/Inventario.css` | Estilos y variables de la pantalla piloto |
| `frontend/src/components/inventario/unificado/` | Resumen filtrable, filtros y tabla |
| `frontend/src/index.css` | Fuentes y estilos globales existentes |

Actualmente hay variables locales de navegación e inventario. Si se aprueba la dirección, evaluar su consolidación en tokens compartidos antes de extenderla a todos los módulos. No crear un tercer conjunto independiente para cada pantalla.

## Cómo continuar en equipo

1. Revisar juntos el inventario y la navegación antes de ampliar el alcance.
2. Registrar qué se acepta, qué se modifica y qué sigue experimental en este documento o en el PR correspondiente.
3. Reutilizar los patrones existentes. Si una pantalla requiere otro patrón, describir la tarea que lo justifica.
4. Trabajar por flujo o familia de componentes, con cambios pequeños y revisión de otra persona.
5. Adjuntar capturas de escritorio y móvil a cada PR visual e indicar los estados comprobados.
6. Actualizar este documento cuando cambie una decisión compartida; no dejar decisiones contradictorias entre pantallas.

La IA debe recibir el contexto de este documento y de los componentes existentes. Las propuestas generadas requieren revisión del equipo; no se consideran aprobadas automáticamente.

## Pendiente de validar

- Lectura de nombres largos, códigos, presentaciones y cantidades grandes.
- Facilidad para reconocer filtros combinados y limpiar la selección.
- Descubrimiento del menú de acciones por producto.
- Reconocimiento de los iconos propios junto a sus etiquetas.
- Tipografía de marca y equilibrio entre densidad y legibilidad.
- Intensidad de las alertas con muchos productos en riesgo.
- Uso prolongado, comportamiento con zoom y dispositivos del equipo.
- Aplicación de la dirección a ventas, caja, laboratorio y reportes.
- Diseño de los formularios y del detalle de lotes.

## Verificación y límites

Antes de integrar, ejecutar desde `frontend/`:

```sh
npm run build
npm run test -- src/layouts/MainLayout.test.jsx src/layouts/Sidebar.test.jsx src/pages/inventario/Inventario.test.jsx src/components/inventario/unificado/InventarioProductosTable.test.jsx
```

La compilación conserva una advertencia sobre el tamaño del bundle principal. Su optimización queda pendiente y no debe confundirse con la aprobación visual de este prototipo.
