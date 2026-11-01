import React from 'react';
import { LockKeyhole } from 'lucide-react';

export default function CajaVentaContexto({ cajas, idCaja, sesionActiva, cargandoCajas, estadoTurno, error, onSeleccionar }) {
  return (
    <div className="pos-caja">
      <div className="pos-caja-field">
        <label htmlFor="caja-punto-venta">Caja para esta venta</label>
        <select
          id="caja-punto-venta"
          value={idCaja || ''}
          onChange={(evento) => onSeleccionar(evento.target.value || null)}
          disabled={cargandoCajas || cajas.length === 0}
        >
          <option value="">
            {cargandoCajas ? 'Cargando cajas...' : 'Selecciona una caja'}
          </option>
          {cajas.map((caja) => (
            <option key={caja.id_caja} value={caja.id_caja}>
              {caja.nombre}{caja.id_sesion_abierta ? ' — turno abierto' : ' — sin turno'}
            </option>
          ))}
        </select>
      </div>
      <span className={`pos-turno ${sesionActiva ? 'pos-turno-activa' : 'pos-turno-inactiva'}`}>
        <LockKeyhole aria-hidden="true" />
        {estadoTurno}
      </span>
      {error && <p role="alert" className="pos-caja-error">{error}</p>}
    </div>
  );
}
