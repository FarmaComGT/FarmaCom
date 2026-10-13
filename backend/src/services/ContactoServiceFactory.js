const AppError = require('../errors/AppError');

/**
 * Construye el servicio de "contacto" (correo o teléfono) compartido entre
 * Sucursal, Proveedor y Casa farmacéutica: valida que el padre exista, valida
 * duplicados cuando aplica (correo), y da forma uniforme a los mensajes de error.
 */
const crearContactoService = ({
  dao,
  daoPadre,
  columnaPadre,
  nombrePadre,
  campoValor,
  nombreValor,
  metodoObtenerPorPadre,
  validarDuplicado = false,
  metodoObtenerPorDuplicado,
  mensajeDuplicado,
}) => {
  const verificarPadre = async (idPadre) => {
    const padre = await daoPadre.obtenerPorId(idPadre);
    if (!padre) {
      throw new AppError(`${nombrePadre} no existe`, 404);
    }
  };

  const buscarDuplicado = (valor) => dao[metodoObtenerPorDuplicado](valor);

  const crear = async (datos) => {
    await verificarPadre(datos[columnaPadre]);

    if (validarDuplicado) {
      const duplicado = await buscarDuplicado(datos[campoValor]);
      if (duplicado) {
        throw new AppError(mensajeDuplicado, 409);
      }
    }

    return dao.crear(datos);
  };

  const obtenerPorPadre = async (idPadre) => {
    await verificarPadre(idPadre);
    return dao[metodoObtenerPorPadre](idPadre);
  };

  const obtenerPorId = async (id) => {
    const registro = await dao.obtenerPorId(id);
    if (!registro) {
      throw new AppError(`${nombreValor} no encontrado`, 404);
    }
    return registro;
  };

  const actualizar = async (id, datos) => {
    const existente = await dao.obtenerPorId(id);
    if (!existente) {
      throw new AppError(`${nombreValor} no encontrado`, 404);
    }

    const valorNuevo = datos[campoValor];
    if (validarDuplicado && valorNuevo && valorNuevo !== existente[campoValor]) {
      const duplicado = await buscarDuplicado(valorNuevo);
      if (duplicado) {
        throw new AppError(mensajeDuplicado, 409);
      }
    }

    return dao.actualizar(id, datos);
  };

  const eliminar = async (id) => {
    const eliminado = await dao.eliminar(id);
    if (!eliminado) {
      throw new AppError(`${nombreValor} no encontrado`, 404);
    }
    return { mensaje: `${nombreValor} eliminado correctamente` };
  };

  return { crear, obtenerPorPadre, obtenerPorId, actualizar, eliminar };
};

module.exports = crearContactoService;
