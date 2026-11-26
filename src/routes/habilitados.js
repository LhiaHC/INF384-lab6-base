/**
 * Router para POST /habilitados.
 *
 * Parsea el cuerpo (express.json() ya está montado en app.js),
 * delega la validación y el cálculo a src/data/cursos-habilitados.js
 * y traduce el resultado a una respuesta HTTP.
 */

const express = require('express');
const { validarAprobados, calcularHabilitados } = require('../data/cursos-habilitados');

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const resultado = validarAprobados(req.body);

    if (!resultado.valido) {
      return res.status(400).json({ error: resultado.error });
    }

    const habilitados = calcularHabilitados(resultado.aprobados);
    return res.status(200).json(habilitados);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
