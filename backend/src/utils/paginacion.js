const crearPaginacion = (pagina, limite, total) => {
  const total_paginas = Math.max(1, Math.ceil(total / limite));
  return { pagina: Math.min(pagina, total_paginas), limite, total, total_paginas };
};
module.exports = { crearPaginacion };
