jest.mock('../services/PacienteService');

const PacienteService = require('../services/PacienteService');
const PacienteController = require('./PacienteController');

const usuario = { id_usuario: 9, rol: 'laboratorista', id_laboratorio: 1 };

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PacienteController', () => {
  it('registra un paciente con el usuario autenticado', async () => {
    PacienteService.registrarPaciente.mockResolvedValue({ id_paciente: 3 });
    const res = mockResponse();

    await PacienteController.registrar({ body: { nombre_paciente: 'Ana' }, usuario }, res);

    expect(PacienteService.registrarPaciente).toHaveBeenCalledWith({ nombre_paciente: 'Ana' }, usuario);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id_paciente: 3 });
  });

  it('busca pacientes con los filtros de la consulta', async () => {
    const resultado = { datos: [], total: 0 };
    PacienteService.buscarPacientes.mockResolvedValue(resultado);
    const res = mockResponse();
    const query = { id_laboratorio: 1, busqueda: 'ana', estado: 'activo', pagina: 2, limite: 10, extra: 'x' };

    await PacienteController.buscar({ query, usuario }, res);

    expect(PacienteService.buscarPacientes).toHaveBeenCalledWith({
      id_laboratorio: 1, busqueda: 'ana', estado: 'activo', pagina: 2, limite: 10,
    }, usuario);
    expect(res.json).toHaveBeenCalledWith(resultado);
  });

  it('obtiene un paciente por id', async () => {
    PacienteService.obtenerPorId.mockResolvedValue({ id_paciente: 3 });
    const res = mockResponse();

    await PacienteController.obtenerPorId({ params: { id: '3' }, usuario }, res);

    expect(PacienteService.obtenerPorId).toHaveBeenCalledWith(3, usuario);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('actualiza un paciente', async () => {
    PacienteService.actualizarPaciente.mockResolvedValue({ id_paciente: 3, telefono: '55551234' });
    const res = mockResponse();

    await PacienteController.actualizar({ params: { id: '3' }, body: { telefono: '55551234' }, usuario }, res);

    expect(PacienteService.actualizarPaciente).toHaveBeenCalledWith(3, { telefono: '55551234' }, usuario);
    expect(res.json).toHaveBeenCalledWith({ id_paciente: 3, telefono: '55551234' });
  });

  it('anula un paciente con su motivo', async () => {
    PacienteService.anularPaciente.mockResolvedValue({ id_paciente: 3, estado: 'anulado' });
    const res = mockResponse();

    await PacienteController.anular({ params: { id: '3' }, body: { motivo_anulacion: 'Duplicado' }, usuario }, res);

    expect(PacienteService.anularPaciente).toHaveBeenCalledWith(3, 'Duplicado', usuario);
    expect(res.json).toHaveBeenCalledWith({ id_paciente: 3, estado: 'anulado' });
  });

  it('envía al middleware el error del servicio', async () => {
    const error = Object.assign(new Error('No tienes acceso al recurso solicitado.'), { statusCode: 403 });
    PacienteService.obtenerPorId.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await PacienteController.obtenerPorId({ params: { id: '3' }, usuario }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
