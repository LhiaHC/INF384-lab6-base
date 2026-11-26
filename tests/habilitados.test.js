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

// ---------------------------------------------------------------------------
// Validación de entrada — criterios 2.x
// ---------------------------------------------------------------------------

function idsValidos(n = 10) {
  return repositorio.listar()
    .map((c) => c.id)
    .slice(0, n);
}

function armarDuplicados() {
  // 100 elementos exactos (límite), con duplicados dentro del límite
  const base = idsValidos(10);
  const arreglo = [];
  while (arreglo.length < 100) {
    arreglo.push(base[arreglo.length % base.length]);
  }
  return { base, arreglo };
}

describe('POST /habilitados — validación de entrada (2.x)', () => {
  // Req 2.1 — aprobados no es un arreglo
  describe('2.1 aprobados no es un arreglo', () => {
    test('cadena de texto en lugar de arreglo → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: '1INF25' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "'aprobados' debe ser un arreglo de cadenas" });
    });

    test('número en lugar de arreglo → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: 123 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "'aprobados' debe ser un arreglo de cadenas" });
    });
  });

  // Req 2.2 — elemento no es cadena
  describe('2.2 elementos deben ser cadenas', () => {
    test('arreglo con un número [123] → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [123] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "'aprobados' debe ser un arreglo de cadenas" });
    });

    test('arreglo con un objeto → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [{ id: '1INF25' }] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "'aprobados' debe ser un arreglo de cadenas" });
    });
  });

  // Req 2.3 — límite de 100 elementos, evaluado antes de deduplicar
  describe('2.3 límite de 100 elementos', () => {
    test('5000 copias duplicadas de un mismo código → 400 (antes de deduplicar)', async () => {
      const payload = new Array(5000).fill('1INF25');

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: payload });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "'aprobados' admite como máximo 100 elementos" });
    });

    test('101 códigos válidos distintos → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF99' /* + otros */] });

      // Catálogo tiene 87 cursos; construir 101 elementos combinando
      // 87 existentes + duplicados sigue superando el límite
      const todos = idsValidos(87);
      const payload = [...todos, ...todos.slice(0, 14)]; // 101
      const res2 = await request(app)
        .post('/habilitados')
        .send({ aprobados: payload });

      expect(res2.status).toBe(400);
      expect(res2.body).toEqual({ error: "'aprobados' admite como máximo 100 elementos" });
    });
  });

  // Req 2.4 — formato alfanumérico
  describe('2.4 formato de código', () => {
    test('"1INF30<script>" → 400 sin reflejar el payload', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF30<script>'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'formato de código inválido' });

      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain('<script>');
      expect(texto).not.toContain('stack');
      expect(texto).not.toMatch(/[A-Za-z]:\\\\/); // sin rutas absolutas
    });

    test('código con espacios "1INF 30" → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF 30'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'formato de código inválido' });
    });

    test('código con inyección "1INF30 OR 1=1--" → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF30 OR 1=1--'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'formato de código inválido' });
    });
  });

  // Req 2.5 — campo ausente
  describe('2.5 campo aprobados ausente', () => {
    test('cuerpo {} → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "el campo 'aprobados' es obligatorio" });
    });

    test('cuerpo con otro campo → 400', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ cursos: [] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "el campo 'aprobados' es obligatorio" });
    });
  });

  // Req 2.6 — arreglo vacío
  describe('2.6 arreglo vacío', () => {
    test('[] → 200 con todos los cursos sin prerrequisitos', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [] });

      expect(res.status).toBe(200);
      const sinPrerrequisitos = repositorio
        .listar()
        .filter((c) => !c.prerequisites || c.prerequisites.length === 0)
        .map((c) => c.id)
        .sort();
      expect(ids(res).sort()).toEqual(sinPrerrequisitos);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // Req 2.7 — dedup tras validar límite
  describe('2.7 deduplicación tras el límite', () => {
    test('100 elementos exactos con duplicados → 200', async () => {
      const { arreglo } = armarDuplicados();
      expect(arreglo).toHaveLength(100);

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: arreglo });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('100 duplicados de un mismo código → 200 (equivalente a [ese código])', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: new Array(100).fill('1INF25') });

      expect(res.status).toBe(200);

      const resUnico = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25'] });

      expect(ids(res)).toEqual(ids(resUnico));
    });
  });

  // Req 2.8 — código inexistente
  describe('2.8 código inexistente', () => {
    test('1INF99 → 400 con mensaje exacto', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF99'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'código de curso inexistente: 1INF99' });
    });

    test('código inexistente entre códigos válidos → 400 con mensaje exacto', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25', '1INF27', '1XYZ00'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'código de curso inexistente: 1XYZ00' });
    });
  });
});

// ---------------------------------------------------------------------------
// Propiedades — criterios 2.x
// ---------------------------------------------------------------------------

describe('Propiedades (2.x)', () => {
  // Property 2: Idempotencia respecto de duplicados
  // Validates: Requirements 2.7
  describe('Property 2: idempotencia respecto de duplicados', () => {
    const iteraciones = 20;

    for (let i = 0; i < iteraciones; i++) {
      test(`iteración ${i + 1}: resultado idéntico con el arreglo deduplicado`, async () => {
        // Generar un arreglo válido (≤100) con duplicados a partir del catálogo
        const catalogo = repositorio.listar().map((c) => c.id);
        const tamano = 1 + Math.floor(Math.random() * 10); // códigos únicos base
        const base = catalogo
          .sort(() => Math.random() - 0.5)
          .slice(0, tamano);
        const total = 1 + Math.floor(Math.random() * 99); // total ≤ 100
        const conDuplicados = Array.from(
          { length: total },
          (_, j) => base[j % base.length],
        );

        const resOriginal = await request(app)
          .post('/habilitados')
          .send({ aprobados: conDuplicados });

        const resDedup = await request(app)
          .post('/habilitados')
          .send({ aprobados: [...new Set(conDuplicados)] });

        expect(resOriginal.status).toBe(200);
        expect(resDedup.status).toBe(200);
        expect(resOriginal.body).toEqual(resDedup.body);
      });
    }
  });

  // Property 4: Rechazo de códigos inexistentes con mensaje correcto
  // Validates: Requirements 2.8
  describe('Property 4: rechazo de códigos inexistentes', () => {
    const codigosInexistentes = [
      '1INF99', '1XYZ00', 'ZZZ999', 'AAAA00', 'X1Y2Z3', '9INF00', 'QWERTY9',
    ];

    for (const codigo of codigosInexistentes) {
      test(`"${codigo}" (alfanumérico, no existe) → 400 con mensaje exacto`, async () => {
        const res = await request(app)
          .post('/habilitados')
          .send({ aprobados: [codigo] });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          error: `código de curso inexistente: ${codigo}`,
        });
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Seguridad — criterios 3.x
// ---------------------------------------------------------------------------

describe('POST /habilitados — seguridad (3.x)', () => {
  // Req 3.1 — error interno → 500 con mensaje genérico sin internos
  describe('3.1 error interno del repositorio → 500', () => {
    let espia;

    afterEach(() => {
      if (espia) {
        espia.mockRestore();
        espia = null;
      }
    });

    test('cuando repositorio.listar() lanza → 500 con {"error": "internal server error"}', async () => {
      espia = jest.spyOn(repositorio, 'listar').mockImplementation(() => {
        throw new Error('fallo simulado de base de datos');
      });

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [] });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'internal server error' });
    });

    test('la respuesta 500 no contiene internos (stack, rutas, módulos)', async () => {
      espia = jest.spyOn(repositorio, 'listar').mockImplementation(() => {
        throw new Error('fallo simulado de base de datos');
      });

      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [] });

      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain('stack');
      expect(texto).not.toMatch(/[A-Za-z]:\\\\/); // sin rutas absolutas estilo Windows
      expect(texto).not.toMatch(/\//);             // sin rutas Unix
      expect(texto).not.toContain('node_modules');
      expect(texto).not.toContain('express');
      expect(texto).not.toContain('Express');
    });
  });

  // Req 3.2 — todas las respuestas de error no contienen internos
  describe('3.2 ninguna respuesta de error revela internos', () => {
    const casosDeError = [
      { nombre: '400 campo ausente',         payload: {} },
      { nombre: '400 tipo inválido (cadena)', payload: { aprobados: '1INF25' } },
      { nombre: '400 elemento no cadena',     payload: { aprobados: [123] } },
      { nombre: '400 límite excedido',        payload: { aprobados: new Array(101).fill('1INF25') } },
      { nombre: '400 formato inválido',       payload: { aprobados: ['1INF30<script>'] } },
      { nombre: '400 código inexistente',     payload: { aprobados: ['ZZZZZZ99'] } },
    ];

    for (const { nombre, payload } of casosDeError) {
      test(`${nombre}: el cuerpo no contiene stack, rutas absolutas ni módulos internos`, async () => {
        const res = await request(app)
          .post('/habilitados')
          .send(payload);

        // Debe ser un error (4xx o 5xx)
        expect(res.status).toBeGreaterThanOrEqual(400);

        const texto = JSON.stringify(res.body);
        expect(texto).not.toContain('stack');
        expect(texto).not.toMatch(/[A-Za-z]:\\\\/); // sin rutas absolutas Windows
        expect(texto).not.toContain('node_modules');
        expect(texto).not.toContain('express');
        expect(texto).not.toContain('Express');
      });
    }
  });

  // Req 3.3 — código con <script> produce 400 sin reflejar el payload ni revelar internos
  // (cubre también junto con 2.4)
  describe('3.3 código con <script> → 400 sin reflejo del payload ni internos', () => {
    test('"1INF30<script>" → 400 sin el valor reflejado fuera del mensaje controlado', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF30<script>'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'formato de código inválido' });

      // El cuerpo no refleja el payload malicioso
      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain('<script>');

      // El cuerpo no contiene internos
      expect(texto).not.toContain('stack');
      expect(texto).not.toMatch(/[A-Za-z]:\\\\/);
      expect(texto).not.toContain('node_modules');
      expect(texto).not.toContain('express');
      expect(texto).not.toContain('Express');
    });

    test('"alert(1);drop table" → 400 sin reflejo del payload', async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['alert(1);drop table'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'formato de código inválido' });

      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain('alert(1)');
      expect(texto).not.toContain('drop table');
    });
  });
});

// ---------------------------------------------------------------------------
// Property 3: Rechazo de códigos malformados sin fuga de información interna
// Validates: Requirements 2.2, 2.4, 3.2, 3.3
// ---------------------------------------------------------------------------

describe('Property 3: Rechazo de códigos malformados sin fuga de información interna', () => {
  // fast-check no está disponible; se usa un test paramétrico con ejemplos representativos
  const codigosMalformados = [
    '1INF30<script>',
    '1INF30 OR 1=1--',
    'abc<def>',
    '123;456',
    'code space',
    'code\ttab',
    '../etc/passwd',
    'código#1',
    'INF@30',
    '1INF30!',
    '1INF30\n',
    '1INF30\r',
    '<img src=x>',
    'INF"30',
    "INF'30",
  ];

  for (const codigo of codigosMalformados) {
    test(`código malformado "${codigo.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}" → 400 sin internos`, async () => {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: [codigo] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'formato de código inválido' });

      const texto = JSON.stringify(res.body);

      // El cuerpo no contiene internos
      expect(texto).not.toContain('stack');
      expect(texto).not.toMatch(/[A-Za-z]:\\\\/); // sin rutas absolutas Windows
      expect(texto).not.toContain('node_modules');
      expect(texto).not.toContain('express');
      expect(texto).not.toContain('Express');
    });
  }
});
