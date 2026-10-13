import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  crearCarpetaPaciente,
  elegirCarpetaRaiz,
  guardarCarpetaRaiz,
  guardarPdfLocal,
  listarRespaldosPorPaciente,
  nombreArchivoResultado,
  nombreCarpetaPaciente,
  obtenerArchivoLocal,
  obtenerCarpetaRaiz,
  registrarRespaldo,
  soportaAlmacenamientoLocal,
  verificarPermiso,
  solicitarPermiso,
} from './almacenamientoLocal';

const crearIndexedDBFake = () => {
  const almacenes = { configuracion: new Map(), respaldos: new Map() };
  const keyPaths = { configuracion: 'id', respaldos: 'id_resultado' };

  const open = () => {
    const peticion = {};
    setTimeout(() => {
      const db = {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => {},
        transaction: (nombreAlmacen) => {
          const tx = {};
          const hacerRequest = (ejecutar) => {
            const req = {};
            setTimeout(() => {
              req.result = ejecutar();
              req.onsuccess && req.onsuccess();
              setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
            }, 0);
            return req;
          };
          tx.objectStore = () => ({
            put: (valor) => hacerRequest(() => {
              almacenes[nombreAlmacen].set(valor[keyPaths[nombreAlmacen]], valor);
            }),
            get: (clave) => hacerRequest(() => almacenes[nombreAlmacen].get(clave)),
            getAll: () => hacerRequest(() => Array.from(almacenes[nombreAlmacen].values())),
          });
          return tx;
        },
      };
      peticion.result = db;
      peticion.onsuccess && peticion.onsuccess();
    }, 0);
    return peticion;
  };

  return { open, _almacenes: almacenes };
};

describe('almacenamientoLocal', () => {
  describe('soportaAlmacenamientoLocal', () => {
    it('devuelve true cuando showDirectoryPicker existe', () => {
      window.showDirectoryPicker = () => {};
      expect(soportaAlmacenamientoLocal()).toBe(true);
      delete window.showDirectoryPicker;
    });

    it('devuelve false cuando showDirectoryPicker no existe', () => {
      delete window.showDirectoryPicker;
      expect(soportaAlmacenamientoLocal()).toBe(false);
    });
  });

  describe('nombreCarpetaPaciente', () => {
    it('sanitiza caracteres inválidos del nombre', () => {
      expect(nombreCarpetaPaciente(3, 'Juan <Perez>:/\\test')).toBe('Juan Pereztest_3');
    });

    it('usa "Paciente" cuando el nombre queda vacío tras sanitizar', () => {
      expect(nombreCarpetaPaciente(5, '////')).toBe('Paciente_5');
    });

    it('recorta espacios repetidos y extremos', () => {
      expect(nombreCarpetaPaciente(1, '  Juan   Perez  ')).toBe('Juan Perez_1');
    });

    it('trunca nombres muy largos a 150 caracteres', () => {
      const nombreLargo = 'a'.repeat(200);
      const resultado = nombreCarpetaPaciente(1, nombreLargo);
      expect(resultado).toBe(`${'a'.repeat(150)}_1`);
    });
  });

  describe('nombreArchivoResultado', () => {
    it('arma el nombre con fecha, categoría e id', () => {
      const resultado = {
        fecha_subida: '2026-01-15T10:00:00Z',
        categoria: 'Laboratorio Clínico',
        id_resultado: 7,
      };
      expect(nombreArchivoResultado(resultado)).toBe('2026-01-15_Laboratorio Clínico_7.pdf');
    });

    it('usa "Resultado" cuando la categoría queda vacía tras sanitizar', () => {
      const resultado = { fecha_subida: '2026-01-15T10:00:00Z', categoria: '///', id_resultado: 1 };
      expect(nombreArchivoResultado(resultado)).toBe('2026-01-15_Resultado_1.pdf');
    });
  });

  describe('verificarPermiso / solicitarPermiso', () => {
    it('devuelve "prompt" cuando no hay handle', async () => {
      await expect(verificarPermiso(null)).resolves.toBe('prompt');
    });

    it('consulta el permiso de lectura/escritura del handle', async () => {
      const handle = { queryPermission: vi.fn().mockResolvedValue('granted') };
      await expect(verificarPermiso(handle)).resolves.toBe('granted');
      expect(handle.queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    it('solicita el permiso de lectura/escritura del handle', async () => {
      const handle = { requestPermission: vi.fn().mockResolvedValue('granted') };
      await expect(solicitarPermiso(handle)).resolves.toBe('granted');
      expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });
  });

  describe('elegirCarpetaRaiz', () => {
    beforeEach(() => {
      vi.stubGlobal('indexedDB', crearIndexedDBFake());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('abre el selector de carpeta y la guarda', async () => {
      const handleFalso = { nombre: 'carpeta-falsa' };
      window.showDirectoryPicker = vi.fn().mockResolvedValue(handleFalso);

      const resultado = await elegirCarpetaRaiz();

      expect(window.showDirectoryPicker).toHaveBeenCalledWith({
        id: 'farmacom-laboratorio',
        mode: 'readwrite',
      });
      expect(resultado).toBe(handleFalso);

      delete window.showDirectoryPicker;
    });
  });

  describe('crearCarpetaPaciente / guardarPdfLocal / obtenerArchivoLocal', () => {
    it('crea la carpeta del paciente dentro de la raíz', async () => {
      const fileHandle = {};
      const raizHandle = { getDirectoryHandle: vi.fn().mockResolvedValue(fileHandle) };

      const resultado = await crearCarpetaPaciente(raizHandle, 3, 'Juan Perez');

      expect(raizHandle.getDirectoryHandle).toHaveBeenCalledWith('Juan Perez_3', { create: true });
      expect(resultado).toBe(fileHandle);
    });

    it('escribe los bytes del PDF en el archivo', async () => {
      const writable = { write: vi.fn().mockResolvedValue(), close: vi.fn().mockResolvedValue() };
      const fileHandle = { createWritable: vi.fn().mockResolvedValue(writable) };
      const carpetaHandle = { getFileHandle: vi.fn().mockResolvedValue(fileHandle) };
      const bytes = new Uint8Array([1, 2, 3]);

      const resultado = await guardarPdfLocal(carpetaHandle, 'archivo.pdf', bytes);

      expect(carpetaHandle.getFileHandle).toHaveBeenCalledWith('archivo.pdf', { create: true });
      expect(writable.write).toHaveBeenCalledWith(bytes);
      expect(writable.close).toHaveBeenCalled();
      expect(resultado).toBe(fileHandle);
    });

    it('obtiene el archivo local de un paciente', async () => {
      const archivoFalso = { name: 'archivo.pdf' };
      const fileHandle = { getFile: vi.fn().mockResolvedValue(archivoFalso) };
      const carpetaHandle = { getFileHandle: vi.fn().mockResolvedValue(fileHandle) };
      const raizHandle = { getDirectoryHandle: vi.fn().mockResolvedValue(carpetaHandle) };

      const resultado = await obtenerArchivoLocal(raizHandle, 3, 'Juan Perez', 'archivo.pdf');

      expect(raizHandle.getDirectoryHandle).toHaveBeenCalledWith('Juan Perez_3');
      expect(carpetaHandle.getFileHandle).toHaveBeenCalledWith('archivo.pdf');
      expect(resultado).toBe(archivoFalso);
    });
  });

  describe('persistencia en IndexedDB', () => {
    beforeEach(() => {
      vi.stubGlobal('indexedDB', crearIndexedDBFake());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('guarda y recupera la carpeta raíz', async () => {
      const handleFalso = { nombre: 'carpeta-falsa' };

      await guardarCarpetaRaiz(handleFalso);
      const resultado = await obtenerCarpetaRaiz();

      expect(resultado).toEqual(handleFalso);
    });

    it('devuelve null si no hay carpeta raíz configurada', async () => {
      await expect(obtenerCarpetaRaiz()).resolves.toBeNull();
    });

    it('registra un respaldo y lo lista por paciente', async () => {
      await registrarRespaldo({
        id_resultado: 1,
        id_paciente: 10,
        nombre_archivo: 'a.pdf',
      });
      await registrarRespaldo({
        id_resultado: 2,
        id_paciente: 20,
        nombre_archivo: 'b.pdf',
      });

      const resultado = await listarRespaldosPorPaciente(10);

      expect(resultado).toEqual([
        { id_resultado: 1, id_paciente: 10, nombre_archivo: 'a.pdf' },
      ]);
    });

    it('devuelve una lista vacía si el paciente no tiene respaldos', async () => {
      await expect(listarRespaldosPorPaciente(999)).resolves.toEqual([]);
    });
  });
});
