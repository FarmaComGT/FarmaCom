# Escenarios de volumen

Esta carpeta contiene pruebas de lectura sobre conjuntos grandes y cuantificables de datos ficticios. `clinical-and-operational.js` cubre las búsquedas paginadas de pacientes, el detalle que contiene el identificador de expediente, los resultados asociados al expediente, los cierres históricos y los reportes de un año.

El backend no expone una ruta independiente para consultar expedientes. Por ello, el escenario comprueba el expediente mediante `GET /pacientes/:id` y sus resultados mediante `GET /resultados-laboratorio?id_paciente=...`, que son los contratos disponibles. No se utilizan datos personales reales ni se inventan endpoints.
