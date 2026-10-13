import { describe, expect, it } from 'vitest';
import {
  crearFiltrosInicialesHistorial,
  prepararFiltrosHistorial,
  validarFiltrosHistorial,
} from './filtrosHistorialVentas';

describe('filtros del historial de ventas', () => {
  it('crea un período predeterminado de treinta días', () => {
    expect(crearFiltrosInicialesHistorial(new Date(2026, 9, 10))).toEqual({
      id_sucursal: '',
      fecha_desde: '2026-09-11',
      fecha_hasta: '2026-10-10',
    });
  });

  it('valida el período y la sucursal', () => {
    expect(validarFiltrosHistorial({ fecha_desde: '', fecha_hasta: '' })).toBe(
      'Selecciona una fecha inicial y una fecha final.',
    );
    expect(validarFiltrosHistorial({
      id_sucursal: '', fecha_desde: '2026-10-11', fecha_hasta: '2026-10-10',
    })).toBe('La fecha inicial no puede ser posterior a la fecha final.');
    expect(validarFiltrosHistorial({
      id_sucursal: 'x', fecha_desde: '2026-10-01', fecha_hasta: '2026-10-10',
    })).toBe('Selecciona una sucursal válida.');
  });

  it('convierte la sucursal aplicada a número', () => {
    expect(prepararFiltrosHistorial({
      id_sucursal: '2', fecha_desde: '2026-10-01', fecha_hasta: '2026-10-10',
    })).toMatchObject({ id_sucursal: 2 });
  });
});
