/**
 * Tests de las funciones puras de src/data/cursos-habilitados.js
 *
 * Cubre criterios 1.1, 1.2 y 2.6 sobre la función calcularHabilitados.
 * El módulo aún no existe (TDD): estos tests fallarán hasta que se implemente.
 */
const repositorio = require('../src/data/repositorio');

// El módulo todavía no existe; cuando se cree en la tarea siguiente pasará.
let calcularHabilitados;
try {
  ({ calcularHabilitados } = require('../src/data/cursos-habilitados'));
} catch (_) {
  calcularHabilitados = undefined;
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
