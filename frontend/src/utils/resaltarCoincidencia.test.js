import { describe, expect, it } from 'vitest';
import {
  obtenerPartesCoincidentes,
  obtenerTextoMasCoincidente,
} from './resaltarCoincidencia';

describe('obtenerPartesCoincidentes', () => {
  it('encuentra una coincidencia directa sin distinguir mayúsculas', () => {
    expect(obtenerPartesCoincidentes('Paracetamol', 'para')).toEqual({
      antes: '',
      coincidencia: 'Para',
      despues: 'cetamol',
    });
  });

  it('conserva las tildes del texto mostrado al resaltar', () => {
    expect(obtenerPartesCoincidentes('Acetaminofén', 'acetaminofen')).toEqual({
      antes: '',
      coincidencia: 'Acetaminofén',
      despues: '',
    });
  });

  it('resalta el fragmento más largo ante una transposición', () => {
    expect(obtenerPartesCoincidentes('Paracetamol', 'paracetamlo')).toEqual({
      antes: '',
      coincidencia: 'Paracetam',
      despues: 'ol',
    });
  });

  it('no resalta cuando no existe un fragmento significativo', () => {
    expect(obtenerPartesCoincidentes('Ibuprofeno', 'azx')).toBeNull();
  });
});

describe('obtenerTextoMasCoincidente', () => {
  it('sugiere el campo del producto más cercano a la búsqueda', () => {
    expect(obtenerTextoMasCoincidente(
      ['Tylenol', 'Paracetamol', 'MED001-UN'],
      'paracetamlo',
    )).toBe('Paracetamol');
  });
});
