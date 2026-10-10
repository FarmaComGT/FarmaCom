const ContactoSucursalService = require('../services/ContactoSucursalService');
const asyncHandler = require('../middlewares/asyncHandler');

class ContactoSucursalController {
  obtener = asyncHandler(async (req, res) => {
    const data = await ContactoSucursalService.obtenerPorSucursal(Number(req.params.id));
    return res.json(data);
  });

  agregarTelefono = asyncHandler(async (req, res) => {
    const telefono = await ContactoSucursalService.agregarTelefono(
      Number(req.params.id),
      req.body.numero,
    );
    return res.status(201).json(telefono);
  });

  eliminarTelefono = asyncHandler(async (req, res) => {
    const eliminado = await ContactoSucursalService.eliminarTelefono(
      Number(req.params.idTelefono),
      Number(req.params.id),
    );
    return res.json(eliminado);
  });

  agregarCorreo = asyncHandler(async (req, res) => {
    const correo = await ContactoSucursalService.agregarCorreo(
      Number(req.params.id),
      req.body.correo,
    );
    return res.status(201).json(correo);
  });

  eliminarCorreo = asyncHandler(async (req, res) => {
    const eliminado = await ContactoSucursalService.eliminarCorreo(
      Number(req.params.idCorreo),
      Number(req.params.id),
    );
    return res.json(eliminado);
  });
}

module.exports = new ContactoSucursalController();
