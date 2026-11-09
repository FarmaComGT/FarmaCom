import { useEffect, useRef } from 'react';
import styles from './FondoParticulas.module.css';

const ESPACIADO = 30;
const RADIO_BASE = 1.4;
const RADIO_MAX = 3.6;
const RADIO_INFLUENCIA = 150;

// Posición del cursor compartida por todas las instancias, en coordenadas de viewport
// (iguales para cualquier canvas). Así el cuadro verde y el fondo blanco reaccionan al
// mismo cursor real en el mismo instante, sin que el radio de revelado se corte en el
// borde de cada uno.
const cursor = { x: -9999, y: -9999 };

// Fondo decorativo reutilizable: una grilla de puntos sobre un color sólido que, al
// acercar el cursor, se vuelve visible y vibra levemente en esa zona, como si la
// superficie se disolviera en partículas. `colorFondo`/`colorPunto` permiten invertir
// la paleta entre instancias (fondo blanco con puntos verdes en la página, fondo verde
// con puntos blancos en la tarjeta).
export default function FondoParticulas({ colorFondo = '#ffffff', colorPunto = '#005147' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const contenedor = canvas?.parentElement;
    if (!canvas || !contenedor) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // El fondo solo vive en el panel de marca y la página, ocultos en móvil (ver .module.css).
    if (window.matchMedia?.('(max-width: 720px)').matches) return undefined;

    const prefiereMovimientoReducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let puntos = [];
    let ancho = 0;
    let alto = 0;
    let desplazamientoX = 0;
    let desplazamientoY = 0;
    let idAnimacion = null;
    const inicio = performance.now();

    const construirGrilla = () => {
      const rect = contenedor.getBoundingClientRect();
      ancho = rect.width;
      alto = rect.height;
      desplazamientoX = rect.left;
      desplazamientoY = rect.top;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const columnas = Math.ceil(ancho / ESPACIADO) + 1;
      const filas = Math.ceil(alto / ESPACIADO) + 1;
      puntos = [];
      for (let fila = 0; fila < filas; fila += 1) {
        for (let columna = 0; columna < columnas; columna += 1) {
          puntos.push({
            x: columna * ESPACIADO,
            y: fila * ESPACIADO,
            desfase: Math.random() * Math.PI * 2,
            velocidad: 0.35 + Math.random() * 0.5,
            angulo: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const dibujar = (ahora) => {
      ctx.clearRect(0, 0, ancho, alto);
      ctx.fillStyle = colorFondo;
      ctx.fillRect(0, 0, ancho, alto);

      const t = (ahora - inicio) / 1000;

      for (const punto of puntos) {
        const dx = (punto.x + desplazamientoX) - cursor.x;
        const dy = (punto.y + desplazamientoY) - cursor.y;
        const cercania = Math.max(0, 1 - Math.hypot(dx, dy) / RADIO_INFLUENCIA);
        const respiracion = prefiereMovimientoReducido ? 0
          : ((Math.sin(t * punto.velocidad + punto.desfase) + 1) / 2) * 0.05;
        const intensidad = Math.min(1, (cercania * cercania) + respiracion);
        if (intensidad < 0.02) continue;

        const jitter = prefiereMovimientoReducido ? 0 : cercania * 3;
        const px = punto.x + Math.cos(punto.angulo + t * 1.6) * jitter;
        const py = punto.y + Math.sin(punto.angulo + t * 1.6) * jitter;
        const radio = RADIO_BASE + (RADIO_MAX - RADIO_BASE) * cercania;

        ctx.beginPath();
        ctx.arc(px, py, radio, 0, Math.PI * 2);
        ctx.fillStyle = colorPunto;
        ctx.globalAlpha = intensidad;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!prefiereMovimientoReducido) {
        idAnimacion = requestAnimationFrame(dibujar);
      }
    };

    const redibujarSiEstatico = () => {
      if (prefiereMovimientoReducido) dibujar(performance.now());
    };

    const manejarMovimiento = (evento) => {
      cursor.x = evento.clientX;
      cursor.y = evento.clientY;
      redibujarSiEstatico();
    };

    const manejarSalida = (evento) => {
      if (evento.relatedTarget !== null) return;
      cursor.x = -9999;
      cursor.y = -9999;
      redibujarSiEstatico();
    };

    const manejarResize = () => {
      construirGrilla();
      redibujarSiEstatico();
    };

    construirGrilla();
    dibujar(performance.now());

    window.addEventListener('pointermove', manejarMovimiento);
    window.addEventListener('pointerout', manejarSalida);
    window.addEventListener('resize', manejarResize);

    return () => {
      if (idAnimacion) cancelAnimationFrame(idAnimacion);
      window.removeEventListener('pointermove', manejarMovimiento);
      window.removeEventListener('pointerout', manejarSalida);
      window.removeEventListener('resize', manejarResize);
    };
  }, [colorFondo, colorPunto]);

  return <canvas ref={canvasRef} className={styles.lienzo} aria-hidden="true" />;
}
