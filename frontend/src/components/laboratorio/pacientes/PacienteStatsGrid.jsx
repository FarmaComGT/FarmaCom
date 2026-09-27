import React from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';
import SummaryCard from '../../SummaryCard.jsx';

export default function PacienteStatsGrid({ totalPacientes, totalActivos, totalAnulados }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <SummaryCard
        icon={Users}
        label="Total"
        value={String(totalPacientes)}
        description="Pacientes registrados"
        colorClass="bg-primary"
        delay={0.05}
      />
      <SummaryCard
        icon={UserCheck}
        label="Activos"
        value={String(totalActivos)}
        description="Pacientes activos"
        colorClass="bg-green-500"
        delay={0.1}
      />
      <SummaryCard
        icon={UserX}
        label="Anulados"
        value={String(totalAnulados)}
        description="Pacientes anulados"
        colorClass="bg-red-500"
        delay={0.15}
      />
    </div>
  );
}
