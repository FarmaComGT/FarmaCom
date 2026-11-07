import { describe, it, expect } from 'vitest';
import { destinoPacientes } from './navegacionPacientes';
describe('Regreso al listado de pacientes', () => {
  it.each(['https://externo.test', '//externo.test', '/pos', '/laboratorio/pacientes/8', '/laboratorio/pacientes/../otro'])('rechaza destinos ajenos: %s', regreso => {
    expect(destinoPacientes(new URLSearchParams({ regreso }))).toBe('/laboratorio/pacientes');
  });
  it('conserva únicamente los filtros del listado', () => {
    expect(destinoPacientes(new URLSearchParams({ regreso: '/laboratorio/pacientes?q=María&pagina=2&estado=activo&laboratorio=3&limite=25&venta=8' })))
      .toBe('/laboratorio/pacientes?q=Mar%C3%ADa&pagina=2&limite=25&estado=activo&laboratorio=3');
  });
  it('ofrece un destino válido al abrir un expediente directamente', () => {
    expect(destinoPacientes(new URLSearchParams())).toBe('/laboratorio/pacientes');
  });
});
