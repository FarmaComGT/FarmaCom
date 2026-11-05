const crearPaginacion = (pagina, limite, total) => {
  const total_paginas = Math.max(1, Math.ceil(total / limite));
  return { pagina: Math.min(pagina, total_paginas), limite, total, total_paginas };
};

const ejecutarConsultaPaginada = async ({
  cliente,
  consultaBase,
  valores = [],
  orden,
  pagina,
  limite,
}) => {
  const parametros = [...valores];
  const conteo = await cliente.query(
    `SELECT COUNT(*) AS total FROM (${consultaBase}) AS consulta_paginada`,
    parametros,
  );
  const paginacion = crearPaginacion(pagina, limite, Number(conteo.rows[0].total));
  parametros.push(paginacion.limite, (paginacion.pagina - 1) * paginacion.limite);
  const indiceLimite = parametros.length - 1;
  const indiceOffset = parametros.length;
  const { rows } = await cliente.query(
    `${consultaBase} ${orden} LIMIT $${indiceLimite} OFFSET $${indiceOffset}`,
    parametros,
  );
  return { datos: rows, paginacion };
};

module.exports = { crearPaginacion, ejecutarConsultaPaginada };
