# Implementation Plan: Cursos habilitados

## Overview

Implementación de `POST /habilitados` siguiendo TDD (criterio E4 del diseño): primero los tests fallidos, luego las funciones puras de validación y cálculo, después la integración de la ruta, y finalmente los gates de seguridad del pipeline (SCA y Gitleaks) con su evidencia registrada en `TRAZABILIDAD.md`.

## Tasks

- [ ] 1. Crear tests iniciales y verificar que fallen
  - [x] 1.1 Escribir tests de criterios funcionales 1.x
    - En `tests/habilitados.test.js` (supertest sobre `src/app.js`) y `tests/habilitados-calculo.test.js` (funciones puras)
    - 1.1: solicitud válida → 200 con solo cursos no aprobados con prerrequisitos satisfechos
    - 1.2: cursos sin prerrequisitos no aprobados incluidos
    - 1.3: `["1INF25", "1INF27", "1INF49"]` → exactamente 27 cursos, incluyendo `1INF29`, `1INF30`, `1INF31`, `1INF32`
    - 1.4: hash de `data/cursos.json` antes/después y espía sobre `repositorio.listar()`
    - **Property 1: Corrección del cálculo de habilitados** (oráculo independiente sobre el catálogo)
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.6**
  - [x] 1.2 Escribir tests de validación 2.x
    - 2.1: `aprobados` como cadena → 400
    - 2.2: elemento no cadena (`[123]`) → 400
    - 2.3: 5000 códigos (aunque sean copias duplicadas) → 400 antes de deduplicar
    - 2.4: `"1INF30<script>"` → 400, sin reflejar el payload
    - 2.5: cuerpo `{}` sin campo `aprobados` → 400
    - 2.6: `[]` → 200 con todos los cursos sin prerrequisitos
    - 2.7: 100 elementos con duplicados → 200 (dedup tras validar el límite)
    - 2.8: `1INF99` → 400 con `"código de curso inexistente: 1INF99"`
    - **Property 2: Idempotencia respecto de duplicados** (resultado idéntico con el arreglo deduplicado)
    - **Property 4: Rechazo de códigos inexistentes con mensaje correcto**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
  - [ ] 1.3 Escribir tests de seguridad 3.x
    - 3.1: mock del repositorio que lanza → 500 con `{"error": "internal server error"}`
    - 3.2: en todos los errores, el cuerpo no contiene `stack`, rutas absolutas ni detalles internos
    - 3.3: cubierto junto con 2.4 (código con `<script>` produce 400 sin revelar internos)
    - **Property 3: Rechazo de códigos malformados sin fuga de información interna**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ] 1.4 Correr los tests y capturar la salida fallida
    - `npx jest tests/habilitados.test.js tests/habilitados-calculo.test.js --runInBand` contra la implementación actual (la ruta no existe → 404)
    - Guardar la salida fallida como evidencia del estado inicial (E4 / TDD)
    - **Validates: Requirements 1.1, 2.1, 3.1**

- [ ] 2. Implementar validaciones y cálculo de habilitados
  - [ ] 2.1 Implementar la validación del payload
    - Crear `src/data/cursos-habilitados.js` (o `src/util/validar-aprobados.js`) con funciones puras sin acceso a `req`/`res`
    - Orden de validación: presencia del campo → tipo arreglo → límite de 100 elementos sobre el arreglo original (antes de deduplicar) → formato alfanumérico `^[A-Za-z0-9]+$` → existencia contra el Repositorio
    - Deduplicar con `new Set(aprobados)` solo después de que todas las validaciones pasan
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8**
  - [ ] 2.2 Implementar `calcularHabilitados`
    - En el mismo módulo: filtrar cursos no aprobados cuyos prerrequisitos estén todos en el `Set` de aprobados (verificación O(1) por prerrequisito)
    - Ordenar por `id` ascendente y proyectar `id`, `name`, `credits`, `cycle`, `type` (sin `prerequisites`)
    - Leer el catálogo exclusivamente vía `src/data/repositorio.js`
    - **Validates: Requirements 1.1, 1.2, 1.4, 2.6**
  - [ ] 2.3 Verificar que los tests de función pura pasan
    - Correr los tests de `tests/habilitados-calculo.test.js`; deben pasar
    - Los tests de ruta siguen fallando (404) porque la ruta no existe todavía
    - **Validates: Requirements 1.1, 1.2, 2.6, 2.7**

- [ ] 3. Integrar POST /habilitados y verificar todas las pruebas
  - [ ] 3.1 Crear el router `src/routes/habilitados.js`
    - Definir `POST /habilitados`: parsear el cuerpo, invocar validación y cálculo, traducir el resultado a 200 con la lista de cursos o 400 con `{"error": "<mensaje>"}`
    - **Validates: Requirements 1.1, 2.1, 2.8**
  - [ ] 3.2 Montar el router en `src/app.js`
    - Registrar el router en `/habilitados`
    - **Validates: Requirements 1.1, 1.3**
  - [ ] 3.3 Verificar la suite completa
    - `npm test` pasa, incluidos el caso de exactamente 27 cursos (criterio 1.3) y la cobertura sobre 80%
    - Capturar la salida verde como evidencia (E4 / TDD)
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3**

- [ ] 4. Implementar y verificar gate SCA
  - [ ] 4.1 Añadir el paso SCA en `.github/workflows/ci.yml`
    - `npm audit --audit-level=high` tras `npm ci`, en `pull_request` y `push` a `main`
    - **Validates: Requirements 4.2**
  - [ ] 4.2 Generar la evidencia del gate
    - Introducir (o mantener) la dependencia vulnerable HIGH (lodash 4.17.20), capturar el run fallido del pipeline
    - Corregir la dependencia (bump o `npm audit fix` si hay parche) y capturar el run corregido
    - **Validates: Requirements 4.2**
  - [ ] 4.3 Registrar en `TRAZABILIDAD.md`
    - Enlace al run fallido y al run corregido para el criterio 4.2
    - **Validates: Requirements 4.2**

- [ ] 5. Implementar y verificar gate Gitleaks
  - [ ] 5.1 Añadir la acción Gitleaks en `.github/workflows/ci.yml`
    - `actions/checkout@v4` con `fetch-depth: 0` + `gitleaks/gitleaks-action@v3` con `GITHUB_TOKEN` y `GITLEAKS_ENABLE_COMMENTS: "false"`, en `pull_request` y `push` a `main`, en paralelo con las pruebas
    - **Validates: Requirements 4.3**
  - [ ] 5.2 Generar la evidencia del gate
    - Introducir un secreto claramente falso (API key de prueba) en un commit del PR, capturar el run fallido
    - Retirar el secreto y capturar el run corregido
    - **Validates: Requirements 4.3**
  - [ ] 5.3 Registrar en `TRAZABILIDAD.md`
    - Enlace al run fallido y al run corregido para el criterio 4.3, anotando que el secreto era falso
    - **Validates: Requirements 4.3**

- [ ] 6. Completar TRAZABILIDAD.md
  - [ ] 6.1 Registrar la matriz requisito → gate → evidencia
    - Para cada criterio: id del requisito, criterio o gate, y evidencia (test verde o run de CI con enlace)
    - 1.x, 2.x y 3.x con los tests de la tarea 3; 4.1 con los runs de cobertura ya existentes; 4.2 con los runs de SCA (tarea 4); 4.3 con los runs de Gitleaks (tarea 5)
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3**
  - [ ] 6.2 Revisión final
    - Verificar que todos los criterios de `requirements.md` tienen al menos una evidencia registrada y que `npm test` sigue en verde
    - **Validates: Requirements 4.1, 4.2, 4.3**

## Notes

- El orden sigue la estrategia TDD del diseño (E4): tests fallidos (tarea 1) → funciones puras (tarea 2) → integración de ruta (tarea 3)
- Las tareas 4 y 5 son independientes entre sí; ambas pueden ejecutarse en paralelo tras la tarea 3
- Los gates de pipeline (4.x) se verifican con pares de runs fallido/corregido en GitHub Actions, no con tests unitarios
- No se añaden dependencias npm al proyecto: Gitleaks corre como acción de GitHub y `npm audit` como paso del pipeline
- `data/cursos.json` nunca se modifica en ninguna tarea

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3"] },
    { "id": 5, "tasks": ["3.1"] },
    { "id": 6, "tasks": ["3.2"] },
    { "id": 7, "tasks": ["3.3"] },
    { "id": 8, "tasks": ["4.1"] },
    { "id": 9, "tasks": ["5.1"] },
    { "id": 10, "tasks": ["4.2", "5.2"] },
    { "id": 11, "tasks": ["4.3"] },
    { "id": 12, "tasks": ["5.3"] },
    { "id": 13, "tasks": ["6.1"] },
    { "id": 14, "tasks": ["6.2"] }
  ]
}
```
