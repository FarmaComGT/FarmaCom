const ContactoSucursalDAO = require('../daos/ContactoSucursalDAO');
const AppError = require('../errors/AppError');

class ContactoSucursalService {
  async obtenerPorSucursal(id_sucursal) {
    return ContactoSucursalDAO.obtenerPorSucursal(id_sucursal);
  }

  async agregarTelefono(id_sucursal, numero) {
    if (!numero || !numero.trim()) throw new AppError('El número es requerido', 400);
    return ContactoSucursalDAO.agregarTelefono(id_sucursal, numero.trim());
  }

  async eliminarTelefono(id_telefono, id_sucursal) {
    const eliminado = await ContactoSucursalDAO.eliminarTelefono(id_telefono, id_sucursal);
    if (!eliminado) throw new AppError('Teléfono no encontrado', 404);
    return eliminado;
  }

  async agregarCorreo(id_sucursal, correo) {
    if (!correo || !correo.trim()) throw new AppError('El correo es requerido', 400);
    return ContactoSucursalDAO.agregarCorreo(id_sucursal, correo.trim());
  }

  async eliminarCorreo(id_correo, id_sucursal) {
    const eliminado = await ContactoSucursalDAO.eliminarCorreo(id_correo, id_sucursal);
    if (!eliminado) throw new AppError('Correo no encontrado', 404);
    return eliminado;
  }
}

module.exports = new ContactoSucursalService();
