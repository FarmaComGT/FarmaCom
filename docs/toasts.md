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
