import React, { useMemo, useState } from 'react';
import LaboratorioActionBar from '../components/laboratorios/LaboratorioActionBar.jsx';
import LaboratorioFormModal from '../components/laboratorios/LaboratorioFormModal.jsx';
import LaboratorioStatsBanner from '../components/laboratorios/LaboratorioStatsBanner.jsx';
import LaboratorioTable from '../components/laboratorios/LaboratorioTable.jsx';
import SucursalAlert from '../components/sucursales/SucursalAlert.jsx';
import SucursalesSubNav from '../components/sucursales/SucursalesSubNav.jsx';
import useCiudades from '../hooks/useCiudades';
import useLaboratorios from '../hooks/useLaboratorios';

const formularioInicial = {
  nombre_laboratorio: '',
  id_ciudad: '',
  direccion: '',
};

export default function Laboratorios() {
  const { laboratorios, cargando, error, crear, actualizar } = useLaboratorios();
  const { ciudades, cargandoCiudades, errorCiudades } = useCiudades();
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(formularioInicial);
  const [laboratorioEditando, setLaboratorioEditando] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const mapaCiudades = useMemo(() => ciudades.reduce((mapa, ciudad) => ({
    ...mapa,
    [ciudad.id_ciudad]: ciudad.nombre_ciudad,
  }), {}), [ciudades]);

  const laboratoriosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return laboratorios;
    return laboratorios.filter((laboratorio) => [
      laboratorio.nombre_laboratorio,
      laboratorio.direccion,
      mapaCiudades[laboratorio.id_ciudad],
    ].some((valor) => valor?.toLocaleLowerCase('es').includes(termino)));
  }, [busqueda, laboratorios, mapaCiudades]);

  const abrirCreacion = () => {
    setLaboratorioEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirEdicion = (laboratorio) => {
    setLaboratorioEditando(laboratorio);
    setFormulario({
      nombre_laboratorio: laboratorio.nombre_laboratorio || '',
      id_ciudad: String(laboratorio.id_ciudad || ''),
      direccion: laboratorio.direccion || '',
    });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (!guardando) setMostrarModal(false);
  };

  const manejarCambio = ({ target: { name, value } }) => {
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    const nombre = formulario.nombre_laboratorio.trim();
    const direccion = formulario.direccion.trim();
    const idCiudad = Number(formulario.id_ciudad);

    if (!nombre || !direccion || !idCiudad) {
      setErrorFormulario('Completa todos los campos del formulario.');
      return;
    }

    const datos = {
      nombre_laboratorio: nombre,
      id_ciudad: idCiudad,
      direccion,
    };

    try {
      setGuardando(true);
      setErrorFormulario(null);
      if (laboratorioEditando) {
        await actualizar(laboratorioEditando.id_laboratorio, datos);
      } else {
        await crear(datos);
      }
      setMostrarModal(false);
      setFormulario(formularioInicial);
    } catch (err) {
      setErrorFormulario(err.message || 'No se pudo guardar el laboratorio.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-8">
      <SucursalesSubNav />

      <div>
        <h1 className="font-headline text-2xl font-extrabold text-primary">Laboratorios</h1>
        <p className="mt-1 text-sm text-slate-500">Administra las ubicaciones donde se atienden pacientes.</p>
      </div>

      <LaboratorioStatsBanner
        totalFiltrados={laboratoriosFiltrados.length}
        totalLaboratorios={laboratorios.length}
      />

      <LaboratorioActionBar
        busqueda={busqueda}
        onBusquedaChange={(evento) => setBusqueda(evento.target.value)}
        onCrear={abrirCreacion}
      />

      <SucursalAlert mensaje={error || errorCiudades} />

      <LaboratorioTable
        cargando={cargando}
        laboratorios={laboratoriosFiltrados}
        mapaCiudades={mapaCiudades}
        onEditar={abrirEdicion}
      />

      <LaboratorioFormModal
        isOpen={mostrarModal}
        modoEdicion={Boolean(laboratorioEditando)}
        formulario={formulario}
        ciudades={ciudades}
        cargandoCiudades={cargandoCiudades}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={manejarCambio}
      />
    </div>
  );
}
