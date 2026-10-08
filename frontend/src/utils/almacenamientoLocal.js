// Respaldo local de PDFs del módulo de laboratorio, usando la File System
// Access API (solo Chrome/Edge) + IndexedDB. No depende de ninguna librería:
// el handle de la carpeta es clonable estructuralmente y se guarda directo
// en IndexedDB; el permiso de lectura/escritura NO persiste entre reinicios
// del navegador y solo puede volver a pedirse dentro de un gesto de usuario
// (click), por eso expone verificarPermiso/solicitarPermiso por separado.

const DB_NOMBRE = 'farmacom-laboratorio';
const DB_VERSION = 1;
const ALMACEN_CONFIGURACION = 'configuracion';
const ALMACEN_RESPALDOS = 'respaldos';
const ID_CARPETA_RAIZ = 'carpetaRaiz';

const CARACTERES_INVALIDOS = /[<>:"/\\|?*\x00-\x1f]/g;

export const soportaAlmacenamientoLocal = () => (
  typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
);

const abrirDb = () => new Promise((resolve, reject) => {
  const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);
  peticion.onupgradeneeded = () => {
    const db = peticion.result;
    if (!db.objectStoreNames.contains(ALMACEN_CONFIGURACION)) {
      db.createObjectStore(ALMACEN_CONFIGURACION, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(ALMACEN_RESPALDOS)) {
      db.createObjectStore(ALMACEN_RESPALDOS, { keyPath: 'id_resultado' });
    }
  };
  peticion.onsuccess = () => resolve(peticion.result);
  peticion.onerror = () => reject(peticion.error);
});

const conAlmacen = async (nombreAlmacen, modo, operacion) => {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(nombreAlmacen, modo);
    const almacen = transaccion.objectStore(nombreAlmacen);
    let resultado;
    Promise.resolve(operacion(almacen))
      .then((valor) => { resultado = valor; })
      .catch(reject);
    transaccion.oncomplete = () => resolve(resultado);
    transaccion.onerror = () => reject(transaccion.error);
  });
};

const solicitudAPromesa = (solicitud) => new Promise((resolve, reject) => {
  solicitud.onsuccess = () => resolve(solicitud.result);
  solicitud.onerror = () => reject(solicitud.error);
});

export const guardarCarpetaRaiz = (handle) => conAlmacen(
  ALMACEN_CONFIGURACION,
  'readwrite',
  (almacen) => solicitudAPromesa(almacen.put({ id: ID_CARPETA_RAIZ, handle })),
);

export const obtenerCarpetaRaiz = async () => {
  const registro = await conAlmacen(
    ALMACEN_CONFIGURACION,
    'readonly',
    (almacen) => solicitudAPromesa(almacen.get(ID_CARPETA_RAIZ)),
  );
  return registro?.handle || null;
};

export const verificarPermiso = async (handle) => {
  if (!handle) return 'prompt';
  return handle.queryPermission({ mode: 'readwrite' });
};

// Solo puede invocarse dentro de un gesto de usuario (ej. onClick).
export const solicitarPermiso = async (handle) => handle.requestPermission({ mode: 'readwrite' });

export const elegirCarpetaRaiz = async () => {
  const handle = await window.showDirectoryPicker({ id: 'farmacom-laboratorio', mode: 'readwrite' });
  await guardarCarpetaRaiz(handle);
  return handle;
};

const sanitizarNombreCarpeta = (nombre) => String(nombre)
  .replace(CARACTERES_INVALIDOS, '')
  .trim()
  .replace(/\s+/g, ' ')
  .slice(0, 150);

export const nombreCarpetaPaciente = (idPaciente, nombrePaciente) => {
  const limpio = sanitizarNombreCarpeta(nombrePaciente) || 'Paciente';
  return `${limpio}_${idPaciente}`;
};

export const nombreArchivoResultado = (resultado) => {
  const fecha = new Date(resultado.fecha_subida).toISOString().slice(0, 10);
  const categoria = sanitizarNombreCarpeta(resultado.categoria) || 'Resultado';
  return `${fecha}_${categoria}_${resultado.id_resultado}.pdf`;
};

export const crearCarpetaPaciente = async (raizHandle, idPaciente, nombrePaciente) => raizHandle.getDirectoryHandle(
  nombreCarpetaPaciente(idPaciente, nombrePaciente),
  { create: true },
);

export const guardarPdfLocal = async (carpetaPacienteHandle, nombreArchivo, bytes) => {
  const fileHandle = await carpetaPacienteHandle.getFileHandle(nombreArchivo, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(bytes);
  await writable.close();
  return fileHandle;
};

export const registrarRespaldo = (metadata) => conAlmacen(
  ALMACEN_RESPALDOS,
  'readwrite',
  (almacen) => solicitudAPromesa(almacen.put(metadata)),
);

export const listarRespaldosPorPaciente = async (idPaciente) => {
  const todos = await conAlmacen(
    ALMACEN_RESPALDOS,
    'readonly',
    (almacen) => solicitudAPromesa(almacen.getAll()),
  );
  return (todos || []).filter((respaldo) => String(respaldo.id_paciente) === String(idPaciente));
};

export const obtenerArchivoLocal = async (raizHandle, idPaciente, nombrePaciente, nombreArchivo) => {
  const carpetaPaciente = await raizHandle.getDirectoryHandle(
    nombreCarpetaPaciente(idPaciente, nombrePaciente),
  );
  const fileHandle = await carpetaPaciente.getFileHandle(nombreArchivo);
  return fileHandle.getFile();
};
