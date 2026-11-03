import { describe, expect, it } from 'vitest';
import { getDefaultRouteForRole } from './navigation';

describe('getDefaultRouteForRole', () => {
  it('envía a dueño y administrador al inicio', () => {
    expect(getDefaultRouteForRole('dueno')).toBe('/dashboard');
    expect(getDefaultRouteForRole('administrador')).toBe('/dashboard');
  });

  it('envía al laboratorista al inicio', () => {
    expect(getDefaultRouteForRole('laboratorista')).toBe('/dashboard');
  });

  it('envía cualquier otro rol al dashboard', () => {
    expect(getDefaultRouteForRole('dependiente')).toBe('/dashboard');
    expect(getDefaultRouteForRole(undefined)).toBe('/dashboard');
  });
});
