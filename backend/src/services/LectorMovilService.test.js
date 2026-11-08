const { crearAlmacenLector } = require('./LectorMovilService');
const { randomUUID } = require('crypto');

describe('Lector móvil: capacidades limitadas y efímeras', () => {
  let almacen;
  let tiempo;
  const usuario = { id_usuario: 7, id_sucursal: 3, token_version: 2 };
  beforeEach(() => { tiempo = 1000; almacen = crearAlmacenLector({ ahora: () => tiempo }); });
  const enviar = (id, token, lectura, codigo) => almacen.enviar(id, token, lectura, codigo, almacen.estado(id, token).contexto);
  const vincular = () => {
    const pc = almacen.crear(usuario, 'ventas');
    const movil = almacen.conectar(pc.id, pc.token);
    return { pc, movil };
  };

  it('usa una credencial diferente tras consumir el enlace y exige confirmación del propietario', () => {
    const { pc, movil } = vincular();
    expect(movil.token).not.toBe(pc.token);
    expect(movil.verificacion).toBe(pc.verificacion);
    expect(() => almacen.conectar(pc.id, pc.token)).toThrow('ya se usó');
    expect(() => almacen.estado(pc.id, pc.token)).toThrow('no es válida');
    expect(() => enviar(pc.id, movil.token, randomUUID(), '000123')).toThrow('Confirma');
    expect(() => almacen.confirmar(pc.id, { ...usuario, id_usuario: 8 })).toThrow('No tienes acceso');
  });

  it('entrega una lectura a su propietario, conserva ceros y no duplica reintentos', () => {
    const { pc, movil } = vincular();
    const id = randomUUID();
    almacen.confirmar(pc.id, usuario);
    almacen.pulso(pc.id, usuario, true);
    enviar(pc.id, movil.token, id, '000123');
    enviar(pc.id, movil.token, id, '000123');
    expect(almacen.pulso(pc.id, usuario, false).lectura).toBeNull();
    expect(almacen.pulso(pc.id, usuario, true).lectura).toEqual({ id, codigo: '000123' });
    expect(() => enviar(pc.id, movil.token, randomUUID(), 'OTRO')).toThrow('ocupada');
    almacen.acuse(pc.id, usuario, id);
    expect(almacen.estado(pc.id, movil.token).ultimoAcuse).toBe(id);
    almacen.pulso(pc.id, usuario, true);
    enviar(pc.id, movil.token, id, '000123');
    expect(almacen.pulso(pc.id, usuario, true).lectura).toBeNull();
  });

  it('rechaza una computadora sin pulso y revoca el teléfono al cerrar la conexión', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario); almacen.pulso(pc.id, usuario, true);
    tiempo += 15000;
    expect(() => enviar(pc.id, movil.token, randomUUID(), 'TEST-1')).toThrow('desconectada');
    almacen.revocar(pc.id, usuario);
    expect(() => almacen.estado(pc.id, movil.token)).toThrow('terminó');
  });

  it('caduca enlaces sin consumir y teléfonos sin confirmar', () => {
    const enlace = almacen.crear(usuario, 'producto');
    tiempo += 120001;
    expect(() => almacen.conectar(enlace.id, enlace.token)).toThrow('terminó');
    const { pc, movil } = vincular();
    tiempo += 120001;
    expect(() => almacen.estado(pc.id, movil.token)).toThrow('terminó');
  });

  it('mantiene la conexión con lecturas válidas después de los primeros diez minutos', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario);
    for (let i = 0; i < 3; i += 1) {
      tiempo += 9 * 60000;
      almacen.pulso(pc.id, usuario, true);
      const id = randomUUID();
      enviar(pc.id, movil.token, id, '000123');
      almacen.acuse(pc.id, usuario, id);
    }
    expect(almacen.estado(pc.id, movil.token).confirmado).toBe(true);
    expect(almacen.estado(pc.id, movil.token).vence).toBe(tiempo + 15 * 60000);
  });

  it('los pulsos y consultas no evitan la desconexión por inactividad', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario);
    for (let i = 0; i < 14; i += 1) {
      tiempo += 60000;
      almacen.pulso(pc.id, usuario, true);
      almacen.estado(pc.id, movil.token);
      almacen.confirmar(pc.id, usuario);
    }
    tiempo += 60000;
    expect(() => almacen.estado(pc.id, movil.token)).toThrow('terminó');
  });

  it('un reintento de lectura ya recibida no renueva el plazo de inactividad', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario); almacen.pulso(pc.id, usuario, true);
    const id = randomUUID();
    enviar(pc.id, movil.token, id, '000123'); almacen.acuse(pc.id, usuario, id);
    tiempo += 14 * 60000;
    almacen.pulso(pc.id, usuario, true);
    enviar(pc.id, movil.token, id, '000123');
    tiempo += 60000;
    expect(() => almacen.estado(pc.id, movil.token)).toThrow('terminó');
  });

  it('respeta el límite de ocho horas aunque se siga escaneando', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario);
    const limite = almacen.estado(pc.id, movil.token).limiteJornada;
    while (tiempo + 14 * 60000 < limite) {
      tiempo += 14 * 60000;
      almacen.pulso(pc.id, usuario, true);
      const id = randomUUID();
      enviar(pc.id, movil.token, id, '000123'); almacen.acuse(pc.id, usuario, id);
    }
    tiempo = limite - 1;
    almacen.pulso(pc.id, usuario, true);
    enviar(pc.id, movil.token, randomUUID(), '000123');
    expect(almacen.estado(pc.id, movil.token).vence).toBe(limite);
    tiempo += 1;
    expect(() => almacen.estado(pc.id, movil.token)).toThrow('terminó');
  });

  it.each([{ token_version: 3 }, { id_sucursal: 4 }])('invalida la vinculación si cambia la sesión: %s', (cambio) => {
    const { pc, movil } = vincular();
    expect(() => almacen.pulso(pc.id, { ...usuario, ...cambio }, true)).toThrow('sesión cambió');
    expect(() => almacen.estado(pc.id, movil.token)).toThrow('terminó');
  });

  it('descarta lecturas pendientes al cambiar de pantalla sin desvincular el teléfono', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario); almacen.pulso(pc.id, usuario, true);
    const contextoAnterior = almacen.estado(pc.id, movil.token).contexto;
    const lectura = randomUUID();
    almacen.enviar(pc.id, movil.token, lectura, 'VENTAS', contextoAnterior);
    const contextoProducto = randomUUID();
    expect(almacen.pulso(pc.id, usuario, true, contextoProducto, 'producto').lectura).toBeNull();
    expect(almacen.estado(pc.id, movil.token)).toMatchObject({ confirmado: true, contexto: contextoProducto, destino: 'producto' });
    expect(() => almacen.enviar(pc.id, movil.token, lectura, 'VENTAS', contextoAnterior)).toThrow('pantalla');
    almacen.enviar(pc.id, movil.token, randomUUID(), 'PRODUCTO', contextoProducto);
    expect(almacen.pulso(pc.id, usuario, true, contextoProducto, 'producto').lectura.codigo).toBe('PRODUCTO');
  });

  it('pausa fuera de un formulario y exige un destino actualizado al reanudar', () => {
    const { pc, movil } = vincular(); almacen.confirmar(pc.id, usuario);
    const contextoPausa = randomUUID();
    const pausa = almacen.pulso(pc.id, usuario, true, contextoPausa, 'pausa');
    expect(pausa.disponible).toBe(false);
    expect(() => almacen.enviar(pc.id, movil.token, randomUUID(), '000123', contextoPausa)).toThrow('pantalla');
    const contextoVentas = randomUUID();
    almacen.pulso(pc.id, usuario, true, contextoVentas, 'ventas');
    expect(() => almacen.enviar(pc.id, movil.token, randomUUID(), '000123')).toThrow('pantalla');
    expect(() => almacen.enviar(pc.id, movil.token, randomUUID(), '000123', contextoPausa)).toThrow('pantalla');
    expect(almacen.enviar(pc.id, movil.token, randomUUID(), '000123', contextoVentas).recibido).toBe(true);
  });

  it('limita sesiones abiertas y valida formato sin convertir números a texto', () => {
    const { pc, movil } = vincular();
    almacen.confirmar(pc.id, usuario); almacen.pulso(pc.id, usuario, true);
    expect(() => enviar(pc.id, movil.token, randomUUID(), 123)).toThrow('texto');
    almacen.crear(usuario, 'producto'); almacen.crear(usuario, 'ventas');
    expect(() => almacen.crear(usuario, 'ventas')).toThrow('Demasiadas'.toLowerCase());
  });
});
