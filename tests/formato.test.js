const {
  formatearNombre,
  formatearCreditos,
  formatearCiclo,
  formatearTipo,
  resumenCurso,
  totalCreditos,
  agruparPorCiclo,
  ordenarPorCreditos,
  listaRequisitos,
} = require('../src/util/formato');

// ─────────────────────────────────────────────
// formatearNombre
// ─────────────────────────────────────────────
describe('formatearNombre', () => {
  test('capitaliza la primera letra de cada palabra', () => {
    expect(formatearNombre('programacion orientada a objetos')).toBe('Programacion Orientada A Objetos');
  });

  test('normaliza texto en mayusculas', () => {
    expect(formatearNombre('CALCULO I')).toBe('Calculo I');
  });

  test('nombre con una sola palabra', () => {
    expect(formatearNombre('fisica')).toBe('Fisica');
  });

  test('nombre ya correctamente capitalizado permanece igual', () => {
    expect(formatearNombre('Algebra Lineal')).toBe('Algebra Lineal');
  });

  test('nombre con espacios multiples: cada token se capitaliza', () => {
    const result = formatearNombre('  base  de  datos  ');
    // lodash split/capitalize maneja tokens vacios; verificamos que contiene palabras clave
    expect(result).toContain('Base');
    expect(result).toContain('De');
    expect(result).toContain('Datos');
  });

  test('cadena vacia devuelve cadena vacia', () => {
    expect(formatearNombre('')).toBe('');
  });
});

// ─────────────────────────────────────────────
// formatearCreditos
// ─────────────────────────────────────────────
describe('formatearCreditos', () => {
  test('numero entero incluye un decimal y la palabra creditos', () => {
    expect(formatearCreditos(3)).toBe('3.0 créditos');
  });

  test('numero decimal se redondea a un decimal', () => {
    expect(formatearCreditos(4.5)).toBe('4.5 créditos');
  });

  test('cero creditos', () => {
    expect(formatearCreditos(0)).toBe('0.0 créditos');
  });

  test('string numerico es convertido correctamente', () => {
    expect(formatearCreditos('6')).toBe('6.0 créditos');
  });

  test('numero con muchos decimales se redondea a 1', () => {
    expect(formatearCreditos(3.456)).toBe('3.5 créditos');
  });
});

// ─────────────────────────────────────────────
// formatearCiclo
// ─────────────────────────────────────────────
describe('formatearCiclo', () => {
  test('ciclo numerico devuelve "Ciclo N"', () => {
    expect(formatearCiclo(3)).toBe('Ciclo 3');
  });

  test('ciclo 1', () => {
    expect(formatearCiclo(1)).toBe('Ciclo 1');
  });

  test('null devuelve "Electivo"', () => {
    expect(formatearCiclo(null)).toBe('Electivo');
  });

  test('undefined devuelve "Electivo"', () => {
    expect(formatearCiclo(undefined)).toBe('Electivo');
  });

  test('ciclo 0 devuelve "Ciclo 0" (valor definido, no null/undefined)', () => {
    expect(formatearCiclo(0)).toBe('Ciclo 0');
  });
});

// ─────────────────────────────────────────────
// formatearTipo
// ─────────────────────────────────────────────
describe('formatearTipo', () => {
  test('"obligatorio" devuelve "Obligatorio"', () => {
    expect(formatearTipo('obligatorio')).toBe('Obligatorio');
  });

  test('"electivo" devuelve "Electivo"', () => {
    expect(formatearTipo('electivo')).toBe('Electivo');
  });

  test('cualquier otro valor devuelve "Electivo"', () => {
    expect(formatearTipo('otro')).toBe('Electivo');
  });

  test('cadena vacia devuelve "Electivo"', () => {
    expect(formatearTipo('')).toBe('Electivo');
  });

  test('null devuelve "Electivo"', () => {
    expect(formatearTipo(null)).toBe('Electivo');
  });

  test('undefined devuelve "Electivo"', () => {
    expect(formatearTipo(undefined)).toBe('Electivo');
  });
});

// ─────────────────────────────────────────────
// resumenCurso
// ─────────────────────────────────────────────
describe('resumenCurso', () => {
  test('formato correcto para un curso tipico', () => {
    const curso = { id: 'INF101', name: 'Introduccion a la Programacion', credits: 4 };
    expect(resumenCurso(curso)).toBe('INF101 · Introduccion a la Programacion · 4.0 créditos');
  });

  test('incluye el id, nombre y creditos formateados', () => {
    const curso = { id: 'MAT201', name: 'Calculo II', credits: 5 };
    const result = resumenCurso(curso);
    expect(result).toContain('MAT201');
    expect(result).toContain('Calculo II');
    expect(result).toContain('5.0 créditos');
  });

  test('creditos decimales se muestran con un decimal', () => {
    const curso = { id: 'FIS301', name: 'Fisica III', credits: 3.5 };
    expect(resumenCurso(curso)).toBe('FIS301 · Fisica III · 3.5 créditos');
  });
});

// ─────────────────────────────────────────────
// totalCreditos
// ─────────────────────────────────────────────
describe('totalCreditos', () => {
  test('suma correctamente varios cursos', () => {
    const cursos = [{ credits: 3 }, { credits: 4 }, { credits: 5 }];
    expect(totalCreditos(cursos)).toBe(12);
  });

  test('lista de un curso', () => {
    expect(totalCreditos([{ credits: 6 }])).toBe(6);
  });

  test('lista vacia devuelve 0', () => {
    expect(totalCreditos([])).toBe(0);
  });

  test('cursos con decimales', () => {
    const cursos = [{ credits: 2.5 }, { credits: 1.5 }];
    expect(totalCreditos(cursos)).toBe(4);
  });
});

// ─────────────────────────────────────────────
// agruparPorCiclo
// ─────────────────────────────────────────────
describe('agruparPorCiclo', () => {
  const cursos = [
    { id: 'INF102', name: 'B', credits: 3, cycle: 1 },
    { id: 'INF101', name: 'A', credits: 4, cycle: 1 },
    { id: 'INF201', name: 'C', credits: 5, cycle: 2 },
    { id: 'INF401', name: 'D', credits: 3, cycle: null },
  ];

  test('agrupa por clave de ciclo formateada', () => {
    const grupos = agruparPorCiclo(cursos);
    expect(grupos).toHaveProperty('Ciclo 1');
    expect(grupos).toHaveProperty('Ciclo 2');
    expect(grupos).toHaveProperty('Electivo');
  });

  test('cursos dentro de cada grupo estan ordenados por id', () => {
    const grupos = agruparPorCiclo(cursos);
    const ciclo1Ids = grupos['Ciclo 1'].map((c) => c.id);
    expect(ciclo1Ids).toEqual(['INF101', 'INF102']);
  });

  test('cursos con cycle null van al grupo Electivo', () => {
    const grupos = agruparPorCiclo(cursos);
    expect(grupos['Electivo'][0].id).toBe('INF401');
  });

  test('lista vacia devuelve objeto vacio', () => {
    expect(agruparPorCiclo([])).toEqual({});
  });
});

// ─────────────────────────────────────────────
// ordenarPorCreditos
// ─────────────────────────────────────────────
describe('ordenarPorCreditos', () => {
  const cursos = [
    { id: 'INF102', credits: 3 },
    { id: 'INF101', credits: 5 },
    { id: 'INF103', credits: 3 },
    { id: 'INF104', credits: 4 },
  ];

  test('ordena de mayor a menor creditos', () => {
    const result = ordenarPorCreditos(cursos);
    expect(result[0].credits).toBe(5);
    expect(result[result.length - 1].credits).toBe(3);
  });

  test('con creditos iguales ordena por id ascendente', () => {
    const result = ordenarPorCreditos(cursos);
    const creditosTres = result.filter((c) => c.credits === 3);
    expect(creditosTres[0].id).toBe('INF102');
    expect(creditosTres[1].id).toBe('INF103');
  });

  test('lista de un elemento', () => {
    const result = ordenarPorCreditos([{ id: 'X', credits: 2 }]);
    expect(result).toHaveLength(1);
  });

  test('lista vacia', () => {
    expect(ordenarPorCreditos([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// listaRequisitos
// ─────────────────────────────────────────────
describe('listaRequisitos', () => {
  test('lista ordenada separada por comas', () => {
    expect(listaRequisitos(['INF201', 'INF101', 'MAT101'])).toBe('INF101, INF201, MAT101');
  });

  test('un solo requisito', () => {
    expect(listaRequisitos(['INF101'])).toBe('INF101');
  });

  test('array vacio devuelve "Sin requisitos"', () => {
    expect(listaRequisitos([])).toBe('Sin requisitos');
  });

  test('null devuelve "Sin requisitos"', () => {
    expect(listaRequisitos(null)).toBe('Sin requisitos');
  });

  test('undefined devuelve "Sin requisitos"', () => {
    expect(listaRequisitos(undefined)).toBe('Sin requisitos');
  });

  test('requisitos ya ordenados se mantienen', () => {
    expect(listaRequisitos(['A100', 'B200', 'C300'])).toBe('A100, B200, C300');
  });
});
