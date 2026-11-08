const crypto = require('crypto');
const AppError = require('../errors/AppError');
const { normalizarCodigoBarras } = require('../utils/codigoBarras');

const VINCULACION_MS = 2 * 60 * 1000;
const INACTIVIDAD_MS = 15 * 60 * 1000;
const JORNADA_MS = 8 * 60 * 60 * 1000;

const secreto = () => crypto.randomBytes(32).toString('hex');
const hash = (valor) => crypto.createHash('sha256').update(valor).digest();
const coincide = (valor, esperado) => typeof valor === 'string' && /^[a-f0-9]{64}$/.test(valor)
  && esperado && crypto.timingSafeEqual(hash(valor), esperado);

// Estado efímero de un único proceso. Un reinicio revoca todas las conexiones.
function crearAlmacenLector({ ahora = Date.now } = {}) {
  const sesiones = new Map();
  const vencimiento = (s) => s.confirmado
    ? Math.min(s.limiteJornada, s.ultimaActividad + INACTIVIDAD_MS)
    : (s.confirmarHasta ?? s.vincularHasta);
  const limpiar = () => {
    for (const [id, s] of sesiones) if (vencimiento(s) <= ahora()) sesiones.delete(id);
  };
  const obtener = (id) => {
    limpiar();
    const s = sesiones.get(id);
    if (!s) throw new AppError('La vinculación terminó. Genera un nuevo enlace en la computadora.', 410);
    return s;
  };
  const propietario = (id, usuario) => {
    const s = obtener(id);
    if (s.usuario !== usuario.id_usuario) throw new AppError('No tienes acceso a esta vinculación.', 403);
    if (s.version !== (usuario.token_version ?? 0) || s.sucursal !== usuario.id_sucursal) {
      sesiones.delete(id);
      throw new AppError('La sesión cambió. Vuelve a vincular el teléfono.', 410);
    }
    return s;
  };
  const movil = (id, token) => {
    const s = obtener(id);
    if (!coincide(token, s.telefono)) throw new AppError('La credencial del lector no es válida.', 401);
    return s;
  };
  const publico = (s) => ({
    id: s.id, vence: vencimiento(s), limiteJornada: s.limiteJornada, inactividadMinutos: INACTIVIDAD_MS / 60000,
    conectado: Boolean(s.telefono), confirmado: s.confirmado,
    verificacion: s.verificacion, contexto: s.contexto, destino: s.destino,
    disponible: s.confirmado && s.disponible && !s.pendiente && ahora() - s.pulso < 15000,
    ultimoAcuse: s.ultimoAcuse,
  });
  return {
    crear(usuario, destino) {
      limpiar();
      if (!Number.isInteger(usuario.id_sucursal) || usuario.id_sucursal <= 0) throw new AppError('Se requiere una sucursal asignada.', 403);
      if (!['ventas', 'producto'].includes(destino)) throw new AppError('Destino de lectura inválido.', 400);
      if (sesiones.size >= 200 || [...sesiones.values()].filter((s) => s.usuario === usuario.id_usuario).length >= 3) {
        throw new AppError('Hay demasiadas vinculaciones abiertas. Desconecta un lector e intenta de nuevo.', 429);
      }
      const token = secreto();
      const s = {
        id: crypto.randomUUID(), usuario: usuario.id_usuario, version: usuario.token_version ?? 0,
        sucursal: usuario.id_sucursal, destino, contexto: crypto.randomUUID(), bootstrap: hash(token), telefono: null,
        vincularHasta: ahora() + VINCULACION_MS, confirmarHasta: null,
        limiteJornada: ahora() + JORNADA_MS, ultimaActividad: null, pulso: ahora(),
        verificacion: String(crypto.randomInt(100000, 1000000)), confirmado: false, disponible: false,
        pendiente: null, ultimoId: null, ultimoAcuse: null,
      };
      sesiones.set(s.id, s);
      return { ...publico(s), token, vincularHasta: s.vincularHasta };
    },
    conectar(id, token) {
      const s = obtener(id);
      if (s.telefono || s.vincularHasta <= ahora() || !coincide(token, s.bootstrap)) throw new AppError('El enlace ya se usó o no es válido. Genera otro en la computadora.', 401);
      const acceso = secreto();
      s.bootstrap = null;
      s.telefono = hash(acceso);
      s.confirmarHasta = ahora() + VINCULACION_MS;
      return { ...publico(s), token: acceso };
    },
    pulso(id, usuario, disponible, contexto, destino) {
      const s = propietario(id, usuario);
      if (contexto !== undefined) {
        if (typeof contexto !== 'string' || !/^[a-f0-9-]{36}$/i.test(contexto) || !['ventas', 'producto', 'pausa'].includes(destino)) throw new AppError('Destino de lectura inválido.', 400);
        if (s.contexto !== contexto) {
          s.contexto = contexto; s.destino = destino;
          s.pendiente = null; s.ultimoAcuse = null;
        } else if (s.destino !== destino) throw new AppError('El destino cambió. Actualiza la pantalla del lector.', 409);
      }
      if (s.destino === 'pausa') disponible = false;
      s.pulso = ahora(); s.disponible = disponible;
      return { ...publico(s), lectura: disponible && s.confirmado ? s.pendiente : null };
    },
    confirmar(id, usuario) {
      const s = propietario(id, usuario);
      if (!s.telefono) throw new AppError('Primero abre el enlace en el teléfono.', 409);
      if (!s.confirmado) { s.confirmado = true; s.ultimaActividad = ahora(); }
      s.pulso = ahora();
      return publico(s);
    },
    acuse(id, usuario, lecturaId) {
      const s = propietario(id, usuario);
      if (s.pendiente?.id === lecturaId) { s.pendiente = null; s.ultimoAcuse = lecturaId; }
      s.disponible = false;
      return publico(s);
    },
    estado(id, token) { return publico(movil(id, token)); },
    datosPropietario(id, token) { const s = movil(id, token); return { id_usuario: s.usuario, token_version: s.version, id_sucursal: s.sucursal }; },
    enviar(id, token, lecturaId, codigo, contexto) {
      const s = movil(id, token);
      if (!s.confirmado) throw new AppError('Confirma el teléfono desde la computadora antes de escanear.', 403);
      if (contexto !== s.contexto || s.destino === 'pausa') throw new AppError('La pantalla de la computadora cambió. Espera a que el lector actualice su destino y vuelve a escanear.', 409);
      const valor = normalizarCodigoBarras(codigo);
      if (!/^[a-f0-9-]{36}$/i.test(lecturaId || '')) throw new AppError('Identificador de lectura inválido.', 400);
      if (s.ultimoId === lecturaId) return { id: lecturaId, recibido: true };
      if (!s.disponible || s.pendiente || ahora() - s.pulso >= 15000) throw new AppError('La computadora está ocupada o desconectada. Espera antes de enviar otra lectura.', 409);
      s.pendiente = { id: lecturaId, codigo: valor };
      s.ultimoId = lecturaId;
      s.ultimaActividad = ahora();
      s.disponible = false;
      return { id: lecturaId, recibido: true };
    },
    revocar(id, usuario) { propietario(id, usuario); sesiones.delete(id); },
    desconectar(id, token) { movil(id, token); sesiones.delete(id); },
    invalidar(id) { sesiones.delete(id); },
  };
}

module.exports = { crearAlmacenLector, lectorMovil: crearAlmacenLector() };
