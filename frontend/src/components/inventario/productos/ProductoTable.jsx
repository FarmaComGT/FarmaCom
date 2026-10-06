import React from 'react';
import { motion } from 'motion/react';
import ProductoTableHeader from './ProductoTableHeader.jsx';
import ProductoTableRow from './ProductoTableRow.jsx';

export default function ProductoTable({
  cargando,
  productos,
  onEditar,
  onCambiarEstado,
  onVerHistorial,
  puedeVerHistorial,
  cambiandoEstadoId,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-surface-container-lowest border border-slate-200 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,81,71,0.02)]"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <ProductoTableHeader />

          {cargando ? (
            <div className="px-6 py-12 text-center text-slate-500 font-medium">
              Cargando productos...
            </div>
          ) : productos.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-medium">
              No hay productos para mostrar.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {productos.map((producto) => (
                <ProductoTableRow
                  key={producto.id_producto}
                  producto={producto}
                  onEditar={onEditar}
                  onCambiarEstado={onCambiarEstado}
                  onVerHistorial={onVerHistorial}
                  puedeVerHistorial={puedeVerHistorial}
                  cambiandoEstado={cambiandoEstadoId === producto.id_producto}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
