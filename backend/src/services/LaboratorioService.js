const LaboratorioDAO = require('../daos/LaboratorioDAO');

const listarActivos = async () => LaboratorioDAO.listarActivos();

module.exports = { listarActivos };
