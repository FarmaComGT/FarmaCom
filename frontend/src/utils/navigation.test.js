import { describe, expect, it } from 'vitest';
import { getDefaultRouteForRole } from './navigation';

describe('getDefaultRouteForRole', () => {
  it('envía a dueño y administrador a los reportes', () => {
    expect(getDefaultRouteForRole('dueno')).toBe('/reports');
    expect(getDefaultRouteForRole('administrador')).toBe('/reports');
  });

  it('envía al laboratorista directo a Laboratorio', () => {
    expect(getDefaultRouteForRole('laboratorista')).toBe('/laboratorio/pacientes');
  });

  it('envía al dependiente directo a caja', () => {
    expect(getDefaultRouteForRole('dependiente')).toBe('/caja');
  });

  it('envía un rol desconocido o sin sesión a la ayuda', () => {
    expect(getDefaultRouteForRole(undefined)).toBe('/support');
    expect(getDefaultRouteForRole('vendedor')).toBe('/support');
  });
});
