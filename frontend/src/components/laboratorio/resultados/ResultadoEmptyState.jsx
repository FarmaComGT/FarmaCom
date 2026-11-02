import React from 'react';
import { FilePlus2 } from 'lucide-react';
import ContentState from '../../ui/ContentState.jsx';

export default function ResultadoEmptyState() {
  return (
    <ContentState
      icon={FilePlus2}
      title="Todavía no hay resultados"
      message="Utiliza “Nuevo resultado” para adjuntar el primer PDF al expediente."
    />
  );
}
