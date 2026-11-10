import React from 'react';
import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import MenuAcciones from '../ui/MenuAcciones.jsx';
import ui from './CajaUI.module.css';
import styles from './CajaTable.module.css';

export default function CajaTable({ cargando, cajas, onEditar, onCambiarEstado, cambiandoEstadoId, onLimpiar }) {
  return <section aria-label="Cajas registradas" aria-busy={cargando}>
    <table className={styles.table}>
      <thead><tr><th scope="col">Caja</th><th scope="col">Sucursal</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
      <tbody>
        {cargando ? Array.from({length: 4}, (_, i) => <tr key={i} aria-hidden="true">{Array.from({length: 4}, (_, j) => <td key={j}><span className={ui.skeleton} /></td>)}</tr>)
        : cajas.length === 0 ? <tr><td colSpan={4}><div className={ui.empty}><p>No hay cajas para mostrar.</p>{onLimpiar && <button type="button" onClick={onLimpiar} className={ui.button}>Limpiar búsqueda</button>}</div></td></tr>
        : cajas.map((caja) => <tr key={caja.id_caja}>
          <td className={styles.name}>{caja.nombre}</td>
          <td>{caja.nombre_sucursal}</td>
          <td><span className={`${ui.badge} ${caja.activa ? ui.active : ''}`}>{caja.activa ? 'Activa' : 'Inactiva'}</span></td>
          <td><div className={styles.rowActions}>
            <MenuAcciones
              etiqueta={`Más acciones para ${caja.nombre}`}
              claseBoton={`${ui.button} ${ui.iconButton}`}
              ocupado={cambiandoEstadoId === caja.id_caja}
              acciones={[
                { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onClick: () => onEditar(caja) },
                { clave: 'estado', etiqueta: caja.activa ? 'Desactivar' : 'Activar', icono: caja.activa ? ToggleRight : ToggleLeft, peligro: caja.activa, onClick: () => onCambiarEstado(caja) },
              ]}
            />
          </div></td>
        </tr>)}
      </tbody>
    </table>
    {cargando && <p role="status" className={ui.count}>Cargando cajas…</p>}
  </section>;
}
