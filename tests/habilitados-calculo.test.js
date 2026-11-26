/**
 * Tests de las funciones puras de src/data/cursos-habilitados.js
 *
 * Cubre criterios 1.1, 1.2 y 2.6 sobre la función calcularHabilitados.
 * El módulo aún no existe (TDD): estos tests fallarán hasta que se implemente.
 */
const repositorio = require('../src/data/repositorio');

// El módulo todavía no existe; cuando se cree en la tarea siguiente pasará.
let calcularHabilitados;
let validarAprobados;
try {
  ({ calcularHabilitados, validarAprobados } = require('../src/data/cursos-habilitados'));
} catch (_) {
  calcularHabilitados = undefined;
  validarAprobados = undefined;
}

/**
 * Oráculo independiente: calcula los habilitados directamente desde
 * data/cursos.json vía el Repositorio, sin usar cursos-habilitados.js.
 */
function oraculo(aprobados) {
  const setAprobados = new Set(aprobados);
  return repositorio
    .listar()
    .filter(
      (c) =>
        !setAprobados.has(c.id) &&
        (c.prerequisites || []).every((p) => setAprobados.has(p)),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, name, credits, cycle, type }) => ({
      id,
      name,
      credits,
      cycle,
      type,
    }));
}

describe('calcularHabilitados (funciones puras)', () => {
  beforeEach(() => {
    if (!calcularHabilitados) {
      // Forzar fallo descriptivo cuando el módulo no existe aún
      throw new Error(
        'src/data/cursos-habilitados.js aún no existe. Implementar en tarea 1.2.',
      );
    }
  });

  // Criterio 1.1 + propiedad oráculo — resultado idéntico al oráculo para distintos conjuntos
  describe('Propiedad 1: oráculo independiente (1.1)', () => {
    const casos = [
      { label: 'conjunto del enunciado', aprobados: ['1INF25', '1INF27', '1INF49'] },
      { label: 'conjunto pequeño', aprobados: ['1INF25'] },
      { label: 'varios del ciclo 5', aprobados: ['1INF25', '1INF27', '1INF28', '1INF33', '1INF49'] },
      { label: 'conjunto con cursos de varios ciclos', aprobados: ['1INF25', '1INF27', '1INF49', '1INF29', '1INF30'] },
    ];

    for (const { label, aprobados } of casos) {
      test(`coincide con el oráculo para: ${label}`, () => {
        const esperado = oraculo(aprobados);
        const resultado = calcularHabilitados(aprobados);
        expect(resultado).toEqual(esperado);
      });
    }
  });

  // Criterio 1.1 — no aprobados incluidos, aprobados excluidos
  describe('1.1 solo cursos no aprobados con prerrequisitos satisfechos', () => {
    test('los cursos aprobados no aparecen en el resultado', () => {
      const aprobados = ['1INF25', '1INF27', '1INF49'];
      const resultado = calcularHabilitados(aprobados);
      const setAprobados = new Set(aprobados);

      for (const c of resultado) {
        expect(setAprobados.has(c.id)).toBe(false);
      }
    });

    test('ningún curso tiene prerrequisitos fuera de aprobados', () => {
      const aprobados = ['1INF25', '1INF27', '1INF49'];
      const resultado = calcularHabilitados(aprobados);
      const setAprobados = new Set(aprobados);
      const catalogo = repositorio.listar();

      for (const c of resultado) {
        const original = catalogo.find((x) => x.id === c.id);
        for (const pre of original.prerequisites || []) {
          expect(setAprobados.has(pre)).toBe(true);
        }
      }
    });

    test('cada elemento tiene exactamente id, name, credits, cycle, type', () => {
      const resultado = calcularHabilitados(['1INF25', '1INF27', '1INF49']);

      for (const c of resultado) {
        expect(Object.keys(c).sort()).toEqual(
          ['credits', 'cycle', 'id', 'name', 'type'].sort(),
        );
      }
    });

    test('resultado ordenado por id ascendente', () => {
      const resultado = calcularHabilitados(['1INF25', '1INF27', '1INF49']);
      const ordenado = [...resultado].sort((a, b) => a.id.localeCompare(b.id));
      expect(resultado).toEqual(ordenado);
    });
  });

  // Criterio 1.2 — cursos sin prerrequisitos no aprobados quedan habilitados
  describe('1.2 cursos sin prerrequisitos', () => {
    test('1GES92 (sin prereq) está en el resultado cuando no está aprobado', () => {
      const resultado = calcularHabilitados(['1INF25']);
      const ids = resultado.map((c) => c.id);
      expect(ids).toContain('1GES92');
    });

    test('1INF25 (sin prereq) NO aparece cuando está en aprobados', () => {
      const resultado = calcularHabilitados(['1INF25']);
      const ids = resultado.map((c) => c.id);
      expect(ids).not.toContain('1INF25');
    });
  });

  // Criterio 2.6 — arreglo vacío devuelve todos los cursos sin prerrequisitos
  describe('2.6 arreglo vacío', () => {
    test('[] devuelve exactamente los cursos sin prerrequisitos (26)', () => {
      const resultado = calcularHabilitados([]);
      const sinPrerrequisitos = repositorio
        .listar()
        .filter((c) => !c.prerequisites || c.prerequisites.length === 0)
        .map((c) => c.id)
        .sort();

      expect(resultado.map((c) => c.id).sort()).toEqual(sinPrerrequisitos);
      expect(resultado).toHaveLength(26);
    });

    test('[] no devuelve ningún curso con prerrequisitos', () => {
      const resultado = calcularHabilitados([]);
      const catalogo = repositorio.listar();

      for (const c of resultado) {
        const original = catalogo.find((x) => x.id === c.id);
        expect(original.prerequisites || []).toHaveLength(0);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Tests de validarAprobados (task 2.1)
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8
// ---------------------------------------------------------------------------

describe('validarAprobados (funciones puras de validación)', () => {
  beforeEach(() => {
    if (!validarAprobados) {
      throw new Error(
        'validarAprobados no exportada desde src/data/cursos-habilitados.js',
      );
    }
  });

  // Req 2.5 — campo ausente
  describe('2.5 campo aprobados ausente', () => {
    test('{} → error de campo obligatorio', () => {
      const resultado = validarAprobados({});
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("el campo 'aprobados' es obligatorio");
    });

    test('null → error de campo obligatorio', () => {
      const resultado = validarAprobados(null);
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("el campo 'aprobados' es obligatorio");
    });

    test('{otrocampo: []} → error de campo obligatorio', () => {
      const resultado = validarAprobados({ otrocampo: [] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("el campo 'aprobados' es obligatorio");
    });
  });

  // Req 2.1 — aprobados no es un arreglo
  describe('2.1 aprobados debe ser arreglo', () => {
    test('cadena de texto → error de tipo', () => {
      const resultado = validarAprobados({ aprobados: '1INF25' });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' debe ser un arreglo de cadenas");
    });

    test('número → error de tipo', () => {
      const resultado = validarAprobados({ aprobados: 123 });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' debe ser un arreglo de cadenas");
    });

    test('objeto → error de tipo', () => {
      const resultado = validarAprobados({ aprobados: { id: '1INF25' } });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' debe ser un arreglo de cadenas");
    });
  });

  // Req 2.3 — límite de 100 elementos antes de deduplicar
  describe('2.3 límite de 100 elementos', () => {
    test('5000 copias duplicadas → error de límite excedido', () => {
      const resultado = validarAprobados({ aprobados: new Array(5000).fill('1INF25') });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' admite como máximo 100 elementos");
    });

    test('101 elementos → error de límite excedido', () => {
      const resultado = validarAprobados({ aprobados: new Array(101).fill('1INF25') });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' admite como máximo 100 elementos");
    });

    test('100 elementos → no error de límite', () => {
      // 100 copias de un código válido; el límite no falla
      // (puede fallar por otro motivo, pero NO por el límite)
      const resultado = validarAprobados({ aprobados: new Array(100).fill('1INF25') });
      expect(resultado.error).not.toBe("'aprobados' admite como máximo 100 elementos");
    });
  });

  // Req 2.2 y 2.4 — tipo y formato de cada elemento
  describe('2.2 y 2.4 tipo y formato de cada elemento', () => {
    test('[123] → error de tipo (no cadena)', () => {
      const resultado = validarAprobados({ aprobados: [123] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' debe ser un arreglo de cadenas");
    });

    test('[{id:"1INF25"}] → error de tipo', () => {
      const resultado = validarAprobados({ aprobados: [{ id: '1INF25' }] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe("'aprobados' debe ser un arreglo de cadenas");
    });

    test('"1INF30<script>" → error de formato', () => {
      const resultado = validarAprobados({ aprobados: ['1INF30<script>'] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe('formato de código inválido');
      // No refleja el payload
      expect(resultado.error).not.toContain('<script>');
    });

    test('"1INF 30" (con espacio) → error de formato', () => {
      const resultado = validarAprobados({ aprobados: ['1INF 30'] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe('formato de código inválido');
    });

    test('"INF@30" → error de formato', () => {
      const resultado = validarAprobados({ aprobados: ['INF@30'] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe('formato de código inválido');
    });
  });

  // Req 2.8 — código inexistente
  describe('2.8 código inexistente', () => {
    test('"1INF99" → error con el código exacto', () => {
      const resultado = validarAprobados({ aprobados: ['1INF99'] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe('código de curso inexistente: 1INF99');
    });

    test('"1XYZ00" → error con el código exacto', () => {
      const resultado = validarAprobados({ aprobados: ['1XYZ00'] });
      expect(resultado.valido).toBe(false);
      expect(resultado.error).toBe('código de curso inexistente: 1XYZ00');
    });
  });

  // Req 2.6 — arreglo vacío es válido
  describe('2.6 arreglo vacío es válido', () => {
    test('[] → valido: true con aprobados = []', () => {
      const resultado = validarAprobados({ aprobados: [] });
      expect(resultado.valido).toBe(true);
      expect(resultado.aprobados).toEqual([]);
    });
  });

  // Req 2.7 — deduplicación solo después de las validaciones
  describe('2.7 deduplicación tras el límite', () => {
    test('100 elementos con duplicados (dentro del límite) → válido con Set', () => {
      const { aprobados: ids } = require('../src/data/repositorio').listar()
        .reduce((acc, c, i) => { if (i < 10) acc.aprobados.push(c.id); return acc; }, { aprobados: [] });
      const arreglo = Array.from({ length: 100 }, (_, j) => ids[j % ids.length]);
      const resultado = validarAprobados({ aprobados: arreglo });
      expect(resultado.valido).toBe(true);
      // La deduplicación produce menos o igual que 10 elementos únicos
      expect(resultado.aprobados.length).toBeLessThanOrEqual(10);
      // No hay duplicados en la salida
      expect(resultado.aprobados.length).toBe(new Set(resultado.aprobados).size);
    });

    test('arreglo con códigos duplicados válidos → resultado deduplicado', () => {
      const resultado = validarAprobados({ aprobados: ['1INF25', '1INF25', '1INF27'] });
      expect(resultado.valido).toBe(true);
      expect(resultado.aprobados).toEqual(['1INF25', '1INF27']);
    });
  });

  // Caso exitoso nominal
  describe('caso exitoso', () => {
    test('["1INF25", "1INF27", "1INF49"] → valido: true', () => {
      const resultado = validarAprobados({ aprobados: ['1INF25', '1INF27', '1INF49'] });
      expect(resultado.valido).toBe(true);
      expect(resultado.aprobados).toEqual(['1INF25', '1INF27', '1INF49']);
    });
  });
});
