/**
 * Funciones puras de validación del payload de POST /habilitados.
 *
 * Sin acceso a req/res: reciben el cuerpo ya parseado y devuelven un
 * resultado descriptivo que la capa HTTP traduce a una respuesta.
 *
 * Orden de validación (fijado en design.md):
 *   1. Presencia del campo `aprobados`
 *   2. Tipo arreglo (Array.isArray)
 *   3. Límite de 100 elementos sobre el arreglo ORIGINAL (antes de deduplicar)
 *   4. Todo elemento es cadena con formato alfanumérico ^[A-Za-z0-9]+$
 *   5. Todo código existe en el catálogo (vía Repositorio)
 * La deduplicación con new Set ocurre solo después de que todo pasa.
 */

const repositorio = require('./repositorio');

const LIMITE_APROBADOS = 100;
const FORMATO_CODIGO = /^[A-Za-z0-9]+$/;

const ERROR_CAMPO_AUSENTE = "el campo 'aprobados' es obligatorio";
const ERROR_TIPO_INVALIDO = "'aprobados' debe ser un arreglo de cadenas";
const ERROR_LIMITE_EXCEDIDO = `'aprobados' admite como máximo ${LIMITE_APROBADOS} elementos`;
const ERROR_FORMATO_INVALIDO = 'formato de código inválido';

function error(mensaje) {
  return { valido: false, error: mensaje };
}

/**
 * Valida el cuerpo de la solicitud y, si es válido, devuelve el arreglo
 * aprobado deduplicado listo para el cálculo.
 *
 * @param {*} cuerpo - cuerpo JSON ya parseado de la solicitud.
 * @returns {{ valido: true, aprobados: string[] } |
 *           { valido: false, error: string }}
 */
function validarAprobados(cuerpo) {
  // 1. Presencia del campo
  if (cuerpo === null || typeof cuerpo !== 'object' || Array.isArray(cuerpo) ||
      !('aprobados' in cuerpo)) {
    return error(ERROR_CAMPO_AUSENTE);
  }

  const { aprobados } = cuerpo;

  // 2. Tipo arreglo
  if (!Array.isArray(aprobados)) {
    return error(ERROR_TIPO_INVALIDO);
  }

  // 3. Límite de 100 elementos sobre el arreglo original, antes de deduplicar.
  //    Así, 5000 copias de un mismo código se rechazan aquí.
  if (aprobados.length > LIMITE_APROBADOS) {
    return error(ERROR_LIMITE_EXCEDIDO);
  }

  // 4. Tipo y formato de cada elemento.
  //    El formato se valida antes de consultar el repositorio para que
  //    cadenas como "1INF30<script>" nunca se usen en búsquedas.
  for (const elemento of aprobados) {
    if (typeof elemento !== 'string') {
      return error(ERROR_TIPO_INVALIDO);
    }
    if (!FORMATO_CODIGO.test(elemento)) {
      return error(ERROR_FORMATO_INVALIDO);
    }
  }

  // 5. Existencia contra el catálogo (única vía: repositorio.obtener)
  for (const codigo of aprobados) {
    if (!repositorio.obtener(codigo)) {
      return error(`código de curso inexistente: ${codigo}`);
    }
  }

  // Todas las validaciones pasaron: deduplicar.
  return { valido: true, aprobados: [...new Set(aprobados)] };
}

/**
 * Calcula los cursos habilitados dado un arreglo de códigos aprobados.
 *
 * Un curso está habilitado si:
 *   - No está en `aprobados`
 *   - Todos sus prerrequisitos están en `aprobados` (vacuamente verdadero si no tiene)
 *
 * Lee el catálogo exclusivamente vía repositorio.listar().
 * Devuelve los cursos ordenados por id ascendente, proyectando solo
 * id, name, credits, cycle, type (sin prerequisites).
 *
 * @param {string[]} aprobados - arreglo de códigos ya aprobados (deduplicado).
 * @returns {{ id: string, name: string, credits: number, cycle: number, type: string }[]}
 */
function calcularHabilitados(aprobados) {
  const aprobadosSet = new Set(aprobados);

  return repositorio
    .listar()
    .filter(
      (curso) =>
        !aprobadosSet.has(curso.id) &&
        (curso.prerequisites || []).every((pre) => aprobadosSet.has(pre)),
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

module.exports = {
  LIMITE_APROBADOS,
  FORMATO_CODIGO,
  validarAprobados,
  calcularHabilitados,
};
