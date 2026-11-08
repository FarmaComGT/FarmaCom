// Quagga usa una instancia global: serializar evita que una cámara antigua cierre otra.
let colaCamara = Promise.resolve();

export function configuracionEscanerCamara(target, deviceId) {
  return {
    inputStream: {
      type: 'LiveStream', target,
      constraints: {
        width: { ideal: 1920 }, height: { ideal: 1080 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
      },
    },
    decoder: { readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'] },
    // Evita perder las barras finas al reducir la imagen para localizar el código.
    locator: { halfSample: false, patchSize: 'small' },
    locate: true, frequency: 3, numOfWorkers: 0,
    canvas: { createOverlay: false },
  };
}

export async function prepararControlesCamara(target) {
  const video = target.querySelector('video');
  const track = video?.srcObject?.getVideoTracks?.()[0];
  const info = {};
  if (video?.videoWidth && video.videoHeight) info.aspectRatio = video.videoWidth / video.videoHeight;
  if (!track?.getCapabilities || !track.applyConstraints) return info;
  let capacidades;
  try { capacidades = track.getCapabilities(); } catch { return info; }
  // Una cámara de enfoque fijo o un navegador sin soporte continúa funcionando.
  if (capacidades.focusMode?.includes('continuous')) {
    try {
      const actuales = track.getConstraints?.() || {};
      await track.applyConstraints({ ...actuales, advanced: [...(actuales.advanced || []), { focusMode: 'continuous' }] });
    } catch { /* Mejora opcional; nunca bloquea el lector. */ }
  }
  const rango = capacidades.zoom;
  if (Number.isFinite(rango?.min) && Number.isFinite(rango?.max) && rango.max > rango.min) {
    const max = Math.max(rango.min, Math.min(rango.max, 4));
    if (max <= rango.min) return info;
    let colaZoom = Promise.resolve();
    info.zoom = {
      min: rango.min, max, step: rango.step > 0 ? rango.step : 0.1,
      value: Math.max(rango.min, Math.min(max, (track.getSettings?.() || {}).zoom ?? rango.min)),
      aplicar: (valor) => {
        const zoom = Math.max(rango.min, Math.min(max, Number(valor)));
        if (!Number.isFinite(zoom)) return Promise.reject(new Error('Zoom inválido.'));
        colaZoom = colaZoom.catch(() => {}).then(() => {
          if (track.readyState === 'ended') return;
          const actuales = track.getConstraints?.() || {};
          return track.applyConstraints({ ...actuales, advanced: [...(actuales.advanced || []).filter((item) => !('zoom' in item)), { zoom }] });
        });
        return colaZoom;
      },
    };
  }
  return info;
}

export function mensajeErrorCamara(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'No se permitió usar la cámara. Habilita el permiso en el navegador e intenta de nuevo.';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'No se encontró esa cámara. Conecta una cámara o selecciona otra.';
  if (error?.name === 'NotReadableError') return 'No se pudo abrir la cámara. Cierra las aplicaciones que la estén usando e intenta de nuevo.';
  return 'No se pudo iniciar la cámara. Revisa la conexión y vuelve a intentarlo.';
}

export function iniciarEscanerCamara({ target, deviceId, onCodigo, onListo, onError }) {
  let cancelado = false;
  let temporizador;
  let finalizar;
  const terminado = new Promise((resolve) => { finalizar = resolve; });
  const detener = () => { cancelado = true; clearTimeout(temporizador); finalizar(); };

  colaCamara = colaCamara.catch(() => {}).then(async () => {
    if (cancelado) return;
    let quagga;
    let detector;
    let procesamiento = Promise.resolve();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible.');
      }
      quagga = (await import('@ericblade/quagga2')).default;
      if (cancelado) return;
      await new Promise((resolve, reject) => quagga.init(configuracionEscanerCamara(target, deviceId), (error) => error ? reject(error) : resolve()));
      if (cancelado) return;
      const controles = await prepararControlesCamara(target);
      if (cancelado) return;
      let anterior = '';
      let ultimaLectura = 0;
      let ultimoCentro = null;
      let repetirUltimo = false;
      detector = (resultado) => {
        if (cancelado) return;
        const codigo = resultado?.codeResult?.code;
        const errores = (resultado?.codeResult?.decodedCodes || []).map((item) => item.error).filter(Number.isFinite);
        if (typeof codigo !== 'string' || !/^[\x21-\x7E]{1,64}$/.test(codigo)) return;
        if (errores.length && errores.reduce((a, b) => a + b, 0) / errores.length > 0.2) return;
        const ahora = Date.now();
        const confirmado = anterior === codigo && ahora - ultimaLectura < 3000;
        anterior = codigo;
        ultimaLectura = ahora;
        if (!confirmado) { repetirUltimo = true; return; }
        // Dos detecciones consecutivas reducen falsos positivos; solo se emite una lectura.
        detener();
        onCodigo(codigo);
      };
      quagga.onDetected(detector);
      // Alternar imagen completa y franjas, siempre de forma secuencial: el
      // localizador y los eventos de Quagga son globales, incluso en decodeSingle.
      const video = target.querySelector('video');
      const canvas = document.createElement('canvas');
      const posiciones = [0.5, 0.4, 0.6];
      let posicion = 0;
      let pasada = 0;
      const leerFranja = () => {
        if (cancelado) return;
        const reprogramar = () => { if (!cancelado) temporizador = setTimeout(leerFranja, 450); };
        if (!video?.videoWidth || video.readyState < 2) { reprogramar(); return; }
        try {
          canvas.width = video.videoWidth;
          const centroRelativo = repetirUltimo ? ultimoCentro : (pasada++ % 2 === 1 ? posiciones[posicion++ % posiciones.length] : null);
          repetirUltimo = false;
          ultimoCentro = centroRelativo;
          const esFranja = centroRelativo !== null;
          canvas.height = esFranja ? Math.max(1, Math.round(video.videoHeight * 0.18)) : video.videoHeight;
          const centro = esFranja ? centroRelativo * video.videoHeight : video.videoHeight / 2;
          const contexto = canvas.getContext('2d');
          contexto.drawImage(video, 0, Math.round(centro - canvas.height / 2), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
          procesamiento = Promise.resolve(quagga.decodeSingle({
            src: canvas.toDataURL('image/png'), numOfWorkers: 0, locate: !esFranja,
            locator: configuracionEscanerCamara().locator, canvas: { createOverlay: false },
            inputStream: { size: canvas.width }, decoder: configuracionEscanerCamara().decoder,
          }, () => {}));
          // La detección llega solo por onDetected: contar también el callback
          // de decodeSingle confirmaría por error dos veces el mismo fotograma.
          procesamiento.then(reprogramar, reprogramar);
        } catch { reprogramar(); }
      };
      temporizador = setTimeout(leerFranja, 450);
      let camaras = [];
      try { camaras = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'videoinput'); } catch { /* La cámara actual puede funcionar sin enumeración. */ }
      if (!cancelado) onListo(camaras, controles);
      await terminado;
    } catch (error) {
      if (!cancelado) onError(error);
    } finally {
      clearTimeout(temporizador);
      if (detector) quagga.offDetected(detector);
      await procesamiento.catch(() => {});
      if (quagga) {
        try { await quagga.stop(); } catch { /* Se libera también el stream del elemento. */ }
        target.querySelectorAll('video').forEach((video) => {
          video.srcObject?.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        });
      }
    }
  });
  return detener;
}
