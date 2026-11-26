# Requirements Document

## Introduction

Funcionalidad para calcular los cursos habilitados para matrícula a partir de la lista de cursos aprobados por el alumno, vía `POST /habilitados`. Incluye requisitos de seguridad derivados de hallazgos de pruebas de intrusión y requisitos no funcionales que cubren los gates de la política de TI.

Ejemplo de solicitud: `{"aprobados": ["1INF25", "1INF27", "1INF49"]}`. La respuesta con este ejemplo debe contener exactamente 27 cursos, incluyendo `1INF29`, `1INF30`, `1INF31` y `1INF32`.

## Glossary

- **Sistema**: Servicio web Malla INF (API Express en `src/`).
- **Curso aprobado**: Curso cuyo código aparece en el arreglo `aprobados` de la solicitud.
- **Curso habilitado**: Curso no aprobado cuyos prerrequisitos están todos dentro de `aprobados`. Un curso sin prerrequisitos está habilitado si no fue aprobado.
- **Código de curso**: Identificador del curso en `data/cursos.json`, cadena alfanumérica (p. ej. `1INF30`).
- **Repositorio**: Módulo `src/data/repositorio.js`, única vía de acceso a `data/cursos.json` (solo lectura).
- **Solicitud válida**: POST con cuerpo JSON `{"aprobados": [<códigos>]}` donde: (a) el campo `aprobados` está presente y es un arreglo, (b) el arreglo contiene como máximo 100 elementos (el límite se evalúa antes de deduplicar), (c) todos los elementos son cadenas con formato alfanumérico (sin símbolos), (d) todos los códigos existen en `data/cursos.json`, y (e) el arreglo vacío `[]` es válido.

## Requirements

### Requirement 1: Calcular cursos habilitados

**User Story:** Como alumno, quiero enviar la lista de cursos que ya aprobé, para saber en qué cursos me puedo matricular.

#### Acceptance Criteria

1.1 WHEN se envíe `POST /habilitados` con una Solicitud válida, THE Sistema SHALL responder 200 con los cursos no aprobados cuyos prerrequisitos estén todos dentro de `aprobados`.

1.2 WHEN un curso no tenga prerrequisitos y no esté en `aprobados`, THE Sistema SHALL incluir ese curso en la respuesta.

1.3 WHEN se envíe `{"aprobados": ["1INF25", "1INF27", "1INF49"]}`, THE Sistema SHALL devolver exactamente 27 cursos, incluyendo `1INF29`, `1INF30`, `1INF31` y `1INF32`.

1.4 WHEN se reciba una Solicitud válida, THE Sistema SHALL leer los datos de la malla exclusivamente a través del Repositorio, sin modificar `data/cursos.json`.

### Requirement 2: Validación de entrada

**User Story:** Como alumno, quiero mensajes de error claros cuando envío datos inválidos, para corregir mi solicitud.

#### Acceptance Criteria

2.1 IF el campo `aprobados` no es un arreglo (p. ej. es una cadena de texto), THEN THE Sistema SHALL responder 400 con `{"error": "<mensaje>"}`.

2.2 IF algún elemento de `aprobados` no es una cadena, THEN THE Sistema SHALL responder 400 con `{"error": "<mensaje>"}`.

2.3 IF la cantidad de códigos en `aprobados` excede 100, THEN THE Sistema SHALL responder 400 con `{"error": "<mensaje>"}` antes de deduplicar y antes de realizar cualquier cálculo.

2.4 IF algún elemento de `aprobados` no coincide con el formato de Código de curso (alfanumérico, sin símbolos; p. ej. `1INF30<script>`), THEN THE Sistema SHALL responder 400 con `{"error": "<mensaje>"}` y sin ejecutar el cálculo.

2.5 IF el campo `aprobados` está ausente del cuerpo de la solicitud, THEN THE Sistema SHALL responder 400 con `{"error": "<mensaje>"}`.

2.6 WHEN `aprobados` sea el arreglo vacío `[]`, THE Sistema SHALL responder 200 con el cálculo de cursos habilitados correspondiente (todos los cursos sin prerrequisitos).

2.7 WHEN la Solicitud válida contenga códigos duplicados, THE Sistema SHALL deduplicarlos después de validar el límite de 100 elementos y antes de calcular los cursos habilitados.

2.8 IF algún elemento de `aprobados` no corresponde a un curso existente en `data/cursos.json` (p. ej. `1INF99`), THEN THE Sistema SHALL responder 400 con `{"error": "código de curso inexistente: <código>"}`.

### Requirement 3: Seguridad del manejo de errores

**User Story:** Como alumno, quiero que los errores no expongan detalles internos del servicio, para proteger el servidor y los datos.

#### Acceptance Criteria

3.1 WHEN ocurra un error no controlado, THE Sistema SHALL responder 500 con `{"error": "<mensaje genérico>"}`.

3.2 THE Sistema SHALL excluir los stack traces, rutas de archivos y detalles internos de toda respuesta de error.

3.3 WHEN se envíe un código con caracteres especiales (p. ej. `1INF30<script>`), THE Sistema SHALL responder 400 sin revelar información interna.

### Requirement 4: Gates de política de TI

**User Story:** Como responsable de TI, quiero que la funcionalidad cumpla las políticas de seguridad y calidad, para mantener el riesgo del servicio bajo control.

#### Acceptance Criteria

4.1 IF la cobertura de líneas del proyecto es inferior a 80%, THEN el pipeline de CI SHALL fallar.

4.2 IF `npm audit` detecta una vulnerabilidad de severidad HIGH o CRITICAL, THEN el pipeline de CI SHALL fallar independientemente de la disponibilidad de parche.

4.3 IF Gitleaks detecta un secreto en el alcance analizado del repositorio, THEN el pipeline de CI SHALL fallar.
