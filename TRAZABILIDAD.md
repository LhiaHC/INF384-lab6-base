
# Trazabilidad

## Requisito → gate → evidencia

| Requisito | Gate (herramienta y umbral) | Bloquea / avisa | Etapa | Run fallido | Run corregido |
| --- | --- | --- | --- | --- | --- |
| Cobertura mínima de líneas del 80% (4.1) | Jest, coverageThreshold: lines 80 | Bloquea | PR y push a main | [Run #1](https://github.com/LhiaHC/INF384-lab6-base/actions/runs/45899471544) | [Run #2](https://github.com/LhiaHC/INF384-lab6-base/actions/runs/45899779288) |
| Dependencias sin vulnerabilidades HIGH o CRITICAL (4.2) | npm audit --audit-level=high | Bloquea, exista o no un parche disponible | PR y push a main | [Run #16](https://github.com/LhiaHC/INF384-lab6-base/actions/runs/45904688839) | [Run #17](https://github.com/LhiaHC/INF384-lab6-base/actions/runs/45905065788) |
| Ausencia de secretos en el repositorio (4.3) | Gitleaks, cualquier secreto detectado en el alcance analizado | Bloquea | PR y push a main | [Run #22](https://github.com/LhiaHC/INF384-lab6-base/actions/runs/45906235841) | [Run #23](https://github.com/LhiaHC/INF384-lab6-base/actions/runs/45906489598) |

## Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué cambiaste | Por qué |
| --- | --- | --- | --- |
| requirements.md | Establecer un límite de 200 códigos aprobados. | Reduje el límite a 100 elementos y establecí que se valide antes de eliminar duplicados. | La malla contiene 87 cursos, por lo que considero que 100 elementos son suficientes y dejan un margen para futuras incorporaciones. Además, validar antes de eliminar duplicados evita que una solicitud excesiva supere este control. |
| requirements.md | Establecer un tiempo máximo de respuesta de 2 segundos. | Eliminé este umbral y mantuve la validación del tamaño del arreglo. | El enunciado no especificaba un tiempo máximo de respuesta y este puede variar según el entorno de ejecución. Preferí mantener un control que pueda comprobarse de manera consistente mediante pruebas. |
| requirements.md | Definir las políticas de seguridad y calidad sin precisar qué ocurre cuando no se cumplen. | Especifiqué que los tres gates deben hacer fallar el pipeline ante un incumplimiento. | No era suficiente reportar los hallazgos. Era necesario que estos tuvieran un efecto sobre el resultado del pipeline. |
| design.md | Incluir el código malformado recibido en el mensaje de error. | Reemplacé el mensaje por "formato de código inválido", sin devolver el valor ingresado. | Consideré innecesario devolver una entrada potencialmente maliciosa al cliente. Es suficiente indicar que el formato no es válido. |

## Implementación y pruebas

Para desarrollar el endpoint POST /habilitados, primero generé las pruebas a partir de los criterios de aceptación definidos en requirements.md. La intención fue comprobar que las pruebas detectaran la ausencia de la funcionalidad antes de comenzar con su implementación.

En esta primera ejecución se registraron 91 pruebas, de las cuales 84 fallaron y 7 pasaron. Los fallos eran esperados, ya que todavía no existían el endpoint ni el módulo encargado del cálculo.

La evidencia de esta ejecución se encuentra en [habilitados-tests-fallidos.txt](evidencia/habilitados-tests-fallidos.txt).

Posteriormente, implementé las validaciones del arreglo de cursos aprobados y el algoritmo de cálculo de cursos habilitados. Utilicé un Set para facilitar las búsquedas de códigos y el tratamiento de duplicados. Finalmente, integré el router en la aplicación Express.

Después de completar la implementación, las 177 pruebas de las 7 suites pasaron correctamente. También se comprobó que el ejemplo proporcionado en el enunciado devuelve exactamente 27 cursos.

La evidencia final se encuentra en [habilitados-tests-verdes.txt](evidencia/habilitados-tests-verdes.txt).

## Trazabilidad de los criterios de aceptación

| Criterio | Comportamiento verificado | Evidencia |
| --- | --- | --- |
| 1.1 | Cálculo correcto de los cursos habilitados. | tests/habilitados.test.js |
| 1.2 | Inclusión de cursos sin prerrequisitos que no han sido aprobados. | tests/habilitados-calculo.test.js |
| 1.3 | Retorno de los 27 cursos del ejemplo del enunciado. | tests/habilitados.test.js |
| 1.4 | Uso del repositorio existente sin modificar cursos.json. | tests/habilitados.test.js |
| 2.1 | Rechazo de aprobados cuando no es un arreglo. | tests/habilitados.test.js |
| 2.2 | Rechazo de elementos que no son cadenas. | tests/habilitados.test.js |
| 2.3 | Rechazo de solicitudes con más de 100 elementos. | tests/habilitados.test.js |
| 2.4 | Validación del formato de los códigos. | tests/habilitados.test.js |
| 2.5 | Rechazo de solicitudes sin el campo aprobados. | tests/habilitados.test.js |
| 2.6 | Procesamiento de un arreglo vacío. | tests/habilitados.test.js |
| 2.7 | Tratamiento correcto de códigos duplicados. | tests/habilitados-calculo.test.js |
| 2.8 | Rechazo de códigos inexistentes en la malla. | tests/habilitados.test.js |
| 3.1 | Respuesta HTTP 500 con un mensaje genérico. | tests/habilitados.test.js |
| 3.2 | Ausencia de información interna en las respuestas de error. | tests/habilitados.test.js |
| 3.3 | Rechazo de códigos malformados sin revelar información interna. | tests/habilitados.test.js |
| 4.1 | Cumplimiento de la cobertura mínima del 80%. | Runs #1 y #2 |
| 4.2 | Bloqueo ante vulnerabilidades HIGH o CRITICAL. | Runs #16 y #17 |
| 4.3 | Bloqueo ante la detección de secretos. | Runs #22 y #23 |

## Verificación de los gates

### Cobertura de pruebas

Al configurar el umbral mínimo del 80%, la cobertura inicial era de 67.21%. Aunque todas las pruebas existentes pasaban, el pipeline fallaba porque no alcanzaba el porcentaje requerido.

Revisé el reporte de cobertura e identifiqué que formato.js no tenía pruebas asociadas. Después de agregar pruebas unitarias para este módulo, la cobertura aumentó a 96.72%.

Con la implementación de POST /habilitados y sus respectivas pruebas, la cobertura final de líneas alcanzó el 100%, mientras que la cobertura de ramas llegó al 93.02%.

### Análisis de dependencias (SCA)

Al incorporar npm audit al pipeline, se detectó una vulnerabilidad de severidad HIGH en lodash. Esto provocó que el job SCA fallara, mientras que las pruebas y la cobertura se mantuvieron en verde.

Para corregir el hallazgo, actualicé lodash a la versión 4.18.1, recomendada por el propio auditor. Preferí actualizar directamente esta dependencia en lugar de ejecutar npm audit fix --force, para evitar cambios innecesarios en otros paquetes.

Después de la actualización, npm audit reportó cero vulnerabilidades y las 177 pruebas continuaron pasando. La siguiente ejecución del pipeline finalizó correctamente.

### Detección de secretos (Gitleaks)

Para comprobar el funcionamiento de Gitleaks, creé una rama temporal llamada prueba-gitleaks-lhc e incorporé una credencial ficticia en un archivo de prueba. Luego abrí un pull request hacia la rama main de mi repositorio.

Gitleaks detectó la credencial mediante la regla github-pat y provocó el fallo del pipeline. Los controles de cobertura y dependencias finalizaron correctamente, lo que permitió comprobar que el fallo correspondía específicamente al detector de secretos.

Después retiré la credencial del historial analizado de la rama de prueba y volví a ejecutar el pipeline. Esta vez, Gitleaks reportó "No leaks detected" y los tres jobs finalizaron correctamente.

La prueba se realizó en una rama independiente para evitar incorporar la credencial ficticia a main.

## Resultado final

| Indicador | Resultado |
| --- | --- |
| Pruebas automatizadas | 177 de 177 exitosas |
| Suites de pruebas | 7 de 7 exitosas |
| Cobertura de líneas | 100% |
| Cobertura de funciones | 100% |
| Cobertura de sentencias | 100% |
| Cobertura de ramas | 93.02% |
| Vulnerabilidades detectadas | 0 |
| Secretos detectados en el escaneo corregido | 0 |

El desarrollo permitió comprobar que no basta con tener una funcionalidad operativa y pruebas exitosas. También es necesario incorporar controles de seguridad que permitan identificar incumplimientos durante la integración continua.

Los tres gates fueron verificados mediante ejecuciones fallidas y corregidas, demostrando que el pipeline falla cuando no se cumplen las condiciones de calidad y seguridad establecidas.
