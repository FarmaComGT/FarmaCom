jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 9, rol: 'dependiente', id_sucursal: 1 };
  next();
});
jest.mock('../database/db');

const express = require('express');
const request = require('supertest');
const pool = require('../database/db');
const routes = require('./InventarioRoutes');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use('/api/sucursales/:id_sucursal/inventario', routes);
app.use(errorHandler);

describe('InventarioRoutes: contrato paginado', () => {
  beforeEach(() => pool.query.mockReset());

  it.each([
    { pagina: '0' }, { pagina: '-1' }, { pagina: '1.5' }, { pagina: 'abc' },
    { pagina: '2147483648' }, { pagina: ['1', '2'] }, { pagina: { valor: 1 } },
    { pagina: '1', limite: '0' }, { pagina: '1', limite: '101' },
    { pagina: '1', limite: ['10', '25'] }, { pagina: '1', activo: '0' },
    { pagina: '1', id_categoria: '2147483648' }, { pagina: '1', id_categoria: 'abc' },
    { pagina: '1', estado_stock: 'invalido' }, { pagina: '1', estado_vencimiento: 'invalido' },
    { pagina: '1', busqueda: 'a'.repeat(151) }, { pagina: '1', busqueda: ['uno', 'dos'] },
  ])('rechaza parámetros inválidos sin consultar la base: %j', async (consulta) => {
    await request(app).get('/api/sucursales/1/inventario').query(consulta).expect(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('normaliza filtros, limita en SQL y devuelve metadatos de la última página', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_sucursal: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: '26' }] })
      .mockResolvedValueOnce({ rows: [{ id_producto: 7 }] });
    const { body } = await request(app).get('/api/sucursales/1/inventario')
      .query({ pagina: 99, activo: 'false', busqueda: '  Paracetamol  ', id_categoria: 3,
        estado_stock: 'agotado', estado_vencimiento: 'vencido', extra: 'ignorar' }).expect(200);
    expect(body).toEqual({ datos: [{ id_producto: 7 }],
      paginacion: { pagina: 2, limite: 25, total: 26, total_paginas: 2 } });
    expect(pool.query.mock.calls[2][1]).toEqual([1, 3, false, 'agotado', 'vencido', 'paracetamol', 25, 25]);
  });

  it('mantiene el arreglo sin paginación que consume el POS', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_sucursal: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id_producto: 1 }] });
    const { body } = await request(app).get('/api/sucursales/1/inventario').expect(200);
    expect(body).toEqual([{ id_producto: 1 }]);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1][0]).not.toContain('OFFSET');
  });

  it('impide consultar otra sucursal incluso con filtros y paginación', async () => {
    await request(app).get('/api/sucursales/2/inventario').query({ pagina: 1, limite: 25 }).expect(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('devuelve 404 si la sucursal no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/sucursales/1/inventario').query({ pagina: 1 }).expect(404);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
