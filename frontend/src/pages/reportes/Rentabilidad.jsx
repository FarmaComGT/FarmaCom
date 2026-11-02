import React from 'react';
import ReporteFiltros from '../../components/reportes/ReporteFiltros.jsx';
import RentabilidadSucursal from '../../components/reportes/RentabilidadSucursal.jsx';
import useFiltrosReportes from '../../hooks/useFiltrosReportes';
import { useRentabilidad } from '../../hooks/useReportes';
import useSucursales from '../../hooks/useSucursales';
import styles from '../../styles/ReportsUI.module.css';

export default function Rentabilidad() {
  React.useEffect(() => {
    document.title = 'Rentabilidad por sucursal · FarmaCom';
  }, []);

  const {
    filtrosEdicion, filtrosAplicados, errorFiltros,
    actualizarFiltro, aplicarFiltros, restablecerFiltros,
  } = useFiltrosReportes();
  const { datos, cargando, error, recargar } = useRentabilidad(filtrosAplicados);
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();

  return (
    <div className={styles.content}>
      <ReporteFiltros
        filtros={filtrosEdicion}
        mostrarAgrupacion={false}
        sucursales={sucursales}
        cargandoSucursales={cargandoSucursales}
        errorSucursales={errorSucursales}
        errorFiltros={errorFiltros}
        onFiltroChange={actualizarFiltro}
        onAplicar={aplicarFiltros}
        onRestablecer={restablecerFiltros}
      />
      <RentabilidadSucursal
        datos={datos}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        idSucursal={filtrosAplicados.id_sucursal}
        nombreSucursal={sucursales.find((sucursal) => String(sucursal.id_sucursal) === String(filtrosAplicados.id_sucursal))?.nombre_sucursal}
      />
    </div>
  );
}
