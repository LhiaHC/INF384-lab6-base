const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Req 1.1 — devuelve todos los cursos con los campos requeridos
  describe('1.1 sin filtro', () => {
    test('responde 200 con un arreglo de 87 cursos', async () => {
      const res = await request(app).get('/cursos');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(87);
    });

    test('cada curso contiene id, name, credits, cycle y type', async () => {
      const res = await request(app).get('/cursos');

      for (const curso of res.body) {
        expect(curso).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            credits: expect.any(Number),
            type: expect.stringMatching(/^(obligatorio|electivo)$/),
          }),
        );
        // cycle puede ser un entero (cursos obligatorios) o null (electivos sin ciclo fijo)
        expect(curso.cycle === null || typeof curso.cycle === 'number').toBe(true);
      }
    });
  });

  // Req 1.2 — filtra por ciclo válido
  describe('1.2 con ?ciclo=N válido', () => {
    test('ciclo=10 devuelve solo los cursos del ciclo 10', async () => {
      const res = await request(app).get('/cursos?ciclo=10');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((c) => c.cycle === 10)).toBe(true);
    });

    test('ciclo=5 devuelve solo los cursos del ciclo 5', async () => {
      const res = await request(app).get('/cursos?ciclo=5');

      expect(res.status).toBe(200);
      expect(res.body.every((c) => c.cycle === 5)).toBe(true);
    });
  });

  // Req 1.3 — ciclo inválido → 400
  describe('1.3 con ?ciclo inválido', () => {
    test('ciclo=4 (menor que 5) devuelve 400', async () => {
      const res = await request(app).get('/cursos?ciclo=4');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });

    test('ciclo=11 (mayor que 10) devuelve 400', async () => {
      const res = await request(app).get('/cursos?ciclo=11');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });

    test('ciclo=abc (no numérico) devuelve 400', async () => {
      const res = await request(app).get('/cursos?ciclo=abc');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });

    test('ciclo=5.5 (decimal) devuelve 400', async () => {
      const res = await request(app).get('/cursos?ciclo=5.5');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });
  });
});

describe('GET /cursos/:codigo', () => {
  // Req 2.1 — código existente devuelve 200 con detalle completo
  describe('2.1 código existente', () => {
    test('responde 200 con todos los campos del curso', async () => {
      const res = await request(app).get('/cursos/1INF30');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: '1INF30',
        name: expect.any(String),
        credits: expect.any(Number),
        type: expect.stringMatching(/^(obligatorio|electivo)$/),
        prerequisites: expect.any(Array),
      });
      // cycle puede ser número o null
      expect(res.body.cycle === null || typeof res.body.cycle === 'number').toBe(true);
    });

    test('cada prerequisito tiene id y name (string)', async () => {
      // 1CON27 tiene al menos un requisito según los datos
      const res = await request(app).get('/cursos/1CON27');

      expect(res.status).toBe(200);
      expect(res.body.prerequisites.length).toBeGreaterThan(0);
      for (const pre of res.body.prerequisites) {
        expect(pre).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
        });
      }
    });

    test('curso sin prerequisitos devuelve prerequisites como arreglo vacío', async () => {
      // 1GES92 no tiene requisitos
      const res = await request(app).get('/cursos/1GES92');

      expect(res.status).toBe(200);
      expect(res.body.prerequisites).toEqual([]);
    });
  });

  // Req 2.2 — código inexistente → 404
  describe('2.2 código inexistente', () => {
    test('responde 404 con mensaje de error', async () => {
      const res = await request(app).get('/cursos/NOEXISTE');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'curso no encontrado' });
    });

    test('código vacío-string no encontrado devuelve 404', async () => {
      const res = await request(app).get('/cursos/XXXXXXXX');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'curso no encontrado' });
    });
  });
});
