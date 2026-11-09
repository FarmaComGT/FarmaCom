import { describe, expect, it } from 'vitest';
import { getDefaultRouteForRole } from './navigation';

describe('getDefaultRouteForRole', () => {
  it('envía a dueño y administrador a los reportes', () => {
    expect(getDefaultRouteForRole('dueno')).toBe('/reports');
    expect(getDefaultRouteForRole('administrador')).toBe('/reports');
  });

  it('envía al laboratorista al inicio', () => {
    expect(getDefaultRouteForRole('laboratorista')).toBe('/dashboard');
  });

  it('envía cualquier otro rol al dashboard', () => {
    expect(getDefaultRouteForRole('dependiente')).toBe('/dashboard');
    expect(getDefaultRouteForRole(undefined)).toBe('/dashboard');
  });
});
