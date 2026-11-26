const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../src/app');
const repositorio = require('../src/data/repositorio');

const RUTA_CURSOS = path.join(__dirname, '..', 'data', 'cursos.json');

function hashCursosJson() {
  const contenido = fs.readFileSync(RUTA_CURSOS, 'utf8');
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

function ids(res) {
  return res.body.map((curso) => curso.id);
}

describe('POST /habilitados — criterios funcionales 1.x', () => {
  // Req 1.1 — solicitud válida devuelve cursos no aprobados con prerrequisitos satisfechos
  describe('1.1 cálculo de habilitados', () => {
    test('responde 200 con un arreglo de cursos', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('solo incluye cursos no aprobados cuyos prerrequisitos están todos en aprobados', async () => {
      const aprobados = ['1INF25', '1INF27', '1INF49'];
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados });

      expect(res.status).toBe(200);

      const catalogo = repositorio.listar();
      const setAprobados = new Set(aprobados);

      for (const curso of res.body) {
        // no aprobado
        expect(setAprobados.has(curso.id)).toBe(false);
        // todos los prerrequisitos dentro de aprobados
        const delCatalogo = catalogo.find((c) => c.id === curso.id);
        expect(delCatalogo).toBeDefined();
        for (const pre of delCatalogo.prerequisites || []) {
          expect(setAprobados.has(pre)).toBe(true);
        }
      }

      // y no omitió ninguno: todo curso del catálogo que cumpla debe estar
      const esperados = catalogo
        .filter(
          (c) =>
            !setAprobados.has(c.id) &&
            (c.prerequisites || []).every((p) => setAprobados.has(p)),
        )
        .map((c) => c.id)
        .sort();
      expect(ids(res).sort()).toEqual(esperados);
    });

    test('cada curso incluye id, name, credits, cycle y type, sin prerequisites', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25'] });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      for (const curso of res.body) {
        expect(Object.keys(curso).sort()).toEqual(
          ['credits', 'cycle', 'id', 'name', 'type'].sort(),
        );
        expect(typeof curso.id).toBe('string');
        expect(typeof curso.name).toBe('string');
        expect(typeof curso.credits).toBe('number');
        expect(
          curso.cycle === null || typeof curso.cycle === 'number',
        ).toBe(true);
      }
    });

    test('la respuesta está ordenada por id ascendente', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

      expect(res.status).toBe(200);
      const lista = ids(res);
      const ordenada = [...lista].sort((a, b) => a.localeCompare(b));
      expect(lista).toEqual(ordenada);
    });
  });

  // Req 1.2 — cursos sin prerrequisitos no aprobados quedan habilitados
  describe('1.2 cursos sin prerrequisitos', () => {
    test('incluye 1GES92 (sin prerrequisitos) cuando no está en aprobados', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25'] });

      expect(res.status).toBe(200);
      expect(ids(res)).toContain('1GES92');
    });

    test('con [] devuelve todos los cursos sin prerrequisitos (26)', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [] });

      expect(res.status).toBe(200);
      const sinPrerrequisitos = repositorio
        .listar()
        .filter(
          (c) => !c.prerequisites || c.prerequisites.length === 0,
        )
        .map((c) => c.id)
        .sort();
      expect(ids(res).sort()).toEqual(sinPrerrequisitos);
      expect(res.body).toHaveLength(sinPrerrequisitos.length);
    });
  });

  // Req 1.3 — ejemplo del enunciado: exactamente 27 cursos
  describe('1.3 ejemplo del enunciado', () => {
    test('{"aprobados": ["1INF25", "1INF27", "1INF49"]} devuelve exactamente 27 cursos', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(27);
    });

    test('incluye 1INF29, 1INF30, 1INF31 y 1INF32', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

      const lista = ids(res);
      expect(lista).toContain('1INF29');
      expect(lista).toContain('1INF30');
      expect(lista).toContain('1INF31');
      expect(lista).toContain('1INF32');
    });
  });

  // Req 1.4 — lectura exclusiva vía repositorio, sin modificar data/cursos.json
  describe('1.4 uso del repositorio sin efectos sobre los datos', () => {
    test('data/cursos.json no cambia (hash idéntico antes y después)', async () => {
      const hashAntes = hashCursosJson();

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

      expect(res.status).toBe(200);
      expect(hashCursosJson()).toBe(hashAntes);
    });

    test('el cálculo pasa por repositorio.listar()', async () => {
      const espia = jest.spyOn(repositorio, 'listar');

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25'] });

      expect(res.status).toBe(200);
      expect(espia).toHaveBeenCalled();
      espia.mockRestore();
    });

    test('data/cursos.json también queda intacto ante solicitud vacía', async () => {
      const hashAntes = hashCursosJson();

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [] });

      expect(res.status).toBe(200);
      expect(hashCursosJson()).toBe(hashAntes);
    });
  });
});
