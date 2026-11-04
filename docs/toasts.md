# Notificaciones globales

`ToastProvider` se monta una sola vez en `main.jsx`, por encima de las rutas.
Las pantallas se migrarán por módulos; esta base no sustituye sus alertas actuales.

```jsx
import { useToast } from '../context/ToastContext.jsx';

const toast = useToast();
toast.success('Categoría guardada correctamente.');
toast.error('No se pudo guardar la categoría. Intenta de nuevo.');
toast.warning('Revisa las existencias antes de continuar.');
toast.info('La consulta está disponible.');
```

- Éxito e información duran 5 segundos; error y advertencia requieren cierre manual.
- Se puede especificar `{ duracion: 8000 }`; `0` conserva el mensaje hasta cerrarlo.
- Cada llamada devuelve un identificador para `toast.cerrar(id)`. Los mensajes idénticos del mismo tipo se deduplican mientras están pendientes o visibles.
- Hay tres mensajes visibles; los demás esperan en orden. Su temporizador empieza al aparecer.
- El tiempo se pausa con el puntero, el foco o la pestaña oculta.
- F8 lleva al primer botón de cierre; Escape devuelve el foco al control anterior.
- Los avisos se renderizan mediante portal fuera de `#root`, sin desplazar el contenido ni recibir foco automáticamente.

Usar toast para el resultado de una acción. Mantener las validaciones junto al campo y los fallos persistentes de carga en la pantalla con una acción de recuperación. Evitar emitir el mismo fallo desde el servicio y desde la pantalla. Confirmar éxito después de completar la operación; distinguir un fallo de actualización posterior de un fallo al guardar.

## Alcance de la migración

Los resultados de operaciones de administración, inventario, caja, pacientes y ventas se notifican mediante el proveedor global. Los contactos y la creación rápida de presentaciones y clientes también usan toast.

Se conservan dentro de las vistas:

- Validaciones locales de formularios y detalles de validación del backend asociados a contactos.
- Errores persistentes de carga con su recuperación.
- Credenciales incorrectas, permisos de almacenamiento local y restricciones de caja o existencias.
- Estados de seguimiento del pago con tarjeta: pendiente, rechazado o no verificable.

Si falla una actualización de inventario o catálogo después de guardar, el mensaje debe indicar que la operación se completó. El comprobante o el éxito de la operación no se revocan por ese fallo posterior.

Los componentes `PacienteAlert`, `UsuarioAlert` y `SucursalAlert` siguen en uso para errores de carga; no deben eliminarse como parte de la limpieza.

Los fallos al renombrar un carrito o al acceder a la carpeta de respaldo también usan toast. Al reintentar se retira el aviso anterior de esa operación. Un nombre vacío continúa validándose junto al campo y la denegación de permisos de la carpeta permanece en el modal. Cancelar el selector de carpeta (`AbortError`) no genera una notificación de error.
