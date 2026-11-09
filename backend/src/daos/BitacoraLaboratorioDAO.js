class BitacoraLaboratorioDAO {
  async crear({ id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos }, client) {
    const { rows } = await client.query(
      `INSERT INTO bitacora_laboratorio
         (id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos],
    );
    return rows[0];
  }
}

module.exports = new BitacoraLaboratorioDAO();
