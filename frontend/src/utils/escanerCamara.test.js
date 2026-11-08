import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { configuracionEscanerCamara, iniciarEscanerCamara, prepararControlesCamara } from './escanerCamara';

const quagga = vi.hoisted(() => ({ init: vi.fn(), start: vi.fn(), stop: vi.fn(), onDetected: vi.fn(), offDetected: vi.fn(), decodeSingle: vi.fn() }));
vi.mock('@ericblade/quagga2', () => ({ default: quagga }));

describe('escanerCamara', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: vi.fn(), enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'videoinput', deviceId: 'webcam', label: 'Webcam' }]),
    } });
    quagga.init.mockImplementation((_config, callback) => callback());
    quagga.stop.mockResolvedValue();
  });

  it('requiere dos detecciones iguales y emite solo una lectura, liberando el stream', async () => {
    const target = document.createElement('div');
    const video = document.createElement('video');
    const stop = vi.fn();
    video.srcObject = { getTracks: () => [{ stop }] };
    target.append(video);
    const onCodigo = vi.fn();
    const onListo = vi.fn();
    iniciarEscanerCamara({ target, onCodigo, onListo, onError: vi.fn() });
    await waitFor(() => expect(onListo).toHaveBeenCalled());
    const detectar = quagga.onDetected.mock.calls[0][0];
    detectar({ codeResult: { code: '000123', decodedCodes: [{ error: 0.05 }] } });
    expect(onCodigo).not.toHaveBeenCalled();
    detectar({ codeResult: { code: '000123', decodedCodes: [{ error: 0.05 }] } });
    detectar({ codeResult: { code: '000123' } });
    expect(onCodigo).toHaveBeenCalledExactlyOnceWith('000123');
    await waitFor(() => expect(stop).toHaveBeenCalled());
    expect(quagga.offDetected).toHaveBeenCalledWith(detectar);
    expect(video.srcObject).toBeNull();
  });

  it('descarta lecturas de baja confianza y detiene una sesión cancelada', async () => {
    const onListo = vi.fn();
    const onCodigo = vi.fn();
    const detener = iniciarEscanerCamara({ target: document.createElement('div'), onListo, onCodigo, onError: vi.fn() });
    await waitFor(() => expect(onListo).toHaveBeenCalled());
    const detectar = quagga.onDetected.mock.calls[0][0];
    detectar({ codeResult: { code: '123', decodedCodes: [{ error: 0.9 }] } });
    detectar({ codeResult: { code: '123', decodedCodes: [{ error: 0.9 }] } });
    detener();
    detectar({ codeResult: { code: '123' } });
    expect(onCodigo).not.toHaveBeenCalled();
    await waitFor(() => expect(quagga.stop).toHaveBeenCalled());
  });

  it('cerrar durante init impide iniciar el video y aun así libera la cámara', async () => {
    let terminarInit;
    quagga.init.mockImplementation((_config, callback) => { terminarInit = callback; });
    const onListo = vi.fn();
    const detener = iniciarEscanerCamara({ target: document.createElement('div'), onListo, onCodigo: vi.fn(), onError: vi.fn() });
    await waitFor(() => expect(quagga.init).toHaveBeenCalled());
    detener();
    terminarInit();
    await waitFor(() => expect(quagga.stop).toHaveBeenCalled());
    expect(quagga.start).not.toHaveBeenCalled();
    expect(onListo).not.toHaveBeenCalled();
  });

  it('no solicita cámara en un contexto HTTP inseguro', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    const onError = vi.fn();
    iniciarEscanerCamara({ target: document.createElement('div'), onListo: vi.fn(), onCodigo: vi.fn(), onError });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error)));
    expect(quagga.init).not.toHaveBeenCalled();
  });

  it('procesa franjas sin localización, confirma dos lecturas y cancela sus tareas al terminar', async () => {
    const target = document.createElement('div');
    const video = document.createElement('video');
    Object.defineProperties(video, { videoWidth: { value: 1920 }, videoHeight: { value: 1080 }, readyState: { value: 4 } });
    target.append(video);
    const drawImage = vi.fn();
    const contexto = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
    const imagen = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,prueba');
    quagga.decodeSingle.mockImplementation((_config, callback) => {
      if (_config.locate) { callback(null); return Promise.resolve(null); }
      const resultado = { codeResult: { code: '000123', decodedCodes: [{ error: 0.05 }] } };
      quagga.onDetected.mock.calls.at(-1)[0](resultado);
      callback(resultado);
      return Promise.resolve(resultado);
    });
    const onCodigo = vi.fn();
    const detener = iniciarEscanerCamara({ target, onListo: vi.fn(), onCodigo, onError: vi.fn() });
    try {
      await waitFor(() => expect(onCodigo).toHaveBeenCalledExactlyOnceWith('000123'), { timeout: 3000 });
      expect(quagga.decodeSingle).toHaveBeenCalledTimes(3);
      expect(quagga.decodeSingle).toHaveBeenCalledWith(expect.objectContaining({ locate: false, inputStream: { size: 1920 } }), expect.any(Function));
      expect(drawImage).toHaveBeenCalledWith(video, 0, expect.any(Number), 1920, 194, 0, 0, 1920, 194);
      await waitFor(() => expect(quagga.stop).toHaveBeenCalled());
    } finally { detener(); contexto.mockRestore(); imagen.mockRestore(); }
  });

  it('preserva el detalle para localizar barras pequeñas y pide Full HD sin exigirlo', () => {
    const config = configuracionEscanerCamara(document.createElement('div'), 'camara');
    expect(config.locator).toEqual({ halfSample: false, patchSize: 'small' });
    expect(config.inputStream.constraints).toMatchObject({ width: { ideal: 1920 }, height: { ideal: 1080 }, deviceId: { exact: 'camara' } });
  });

  it('activa enfoque continuo y ofrece solo el zoom admitido, conservando las otras restricciones', async () => {
    const track = {
      getCapabilities: () => ({ focusMode: ['manual', 'continuous'], zoom: { min: 1, max: 8, step: 0.1 } }),
      getConstraints: () => ({ width: { ideal: 1920 } }), getSettings: () => ({ zoom: 1 }),
      applyConstraints: vi.fn().mockResolvedValue(),
    };
    const target = { querySelector: () => ({ videoWidth: 1920, videoHeight: 1080, srcObject: { getVideoTracks: () => [track] } }) };
    const info = await prepararControlesCamara(target);
    expect(info.aspectRatio).toBeCloseTo(16 / 9);
    expect(track.applyConstraints).toHaveBeenCalledWith({ width: { ideal: 1920 }, advanced: [{ focusMode: 'continuous' }] });
    expect(info.zoom.max).toBe(4);
    await info.zoom.aplicar(2);
    expect(track.applyConstraints).toHaveBeenLastCalledWith({ width: { ideal: 1920 }, advanced: [{ zoom: 2 }] });
  });

  it('un enfoque no soportado no impide continuar y no inventa un control de zoom', async () => {
    const track = { getCapabilities: () => ({ focusMode: ['continuous'] }), applyConstraints: vi.fn().mockRejectedValue(new Error('No compatible')) };
    const info = await prepararControlesCamara({ querySelector: () => ({ srcObject: { getVideoTracks: () => [track] } }) });
    expect(info.zoom).toBeUndefined();
  });
});
