const express = require('express');
const pool = require('../database/db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      estado: 'saludable',
      base_datos: 'disponible',
    });
  } catch (_error) {
    return res.status(503).json({
      estado: 'no_disponible',
      base_datos: 'no_disponible',
    });
  }
});

module.exports = router;
