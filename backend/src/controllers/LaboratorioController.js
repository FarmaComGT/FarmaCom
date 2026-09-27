const LaboratorioService = require('../services/LaboratorioService');

const listar = async (req, res) => {
  try {
    const laboratorios = await LaboratorioService.listarActivos();
    res.status(200).json(laboratorios);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { listar };
