// ============================
// Gastos Comunes - Sincronización
// ============================

/**
 * Recalcula el total de gastos de una copropiedad por mes
 * y lo sincroniza con la tabla GastosComunes en AppSheet.
 *
 * @param {string} coproID - ID de la copropiedad
 * @param {string} mes - Mes en formato "MM-YYYY"
 */
async function actualizarGastosComunes(coproID, mes){
  try {
    // Traer todos los gastos
    const gastos = await fetchData("Gastos");

    // Filtrar por copropiedad y mes
    const filtrados = gastos.filter(g =>
      String(g.CopropiedadID)===String(coproID) &&
      String(g.Mes)===String(mes)
    );

    // Calcular total
    const total = filtrados.reduce((acc,g)=>acc+(parseFloat(g.Monto)||0),0);

    // ID en GastosComunes = CopropiedadID-Mes
    const idGC = `${coproID}-${mes}`;

    // Traer la tabla GastosComunes
    const comunes = await fetchData("GastosComunes");
    const existente = comunes.find(gc => String(gc.ID)===idGC);

    if(existente){
      // 🔄 Actualizar fila existente
      await appSheetCRUD("GastosComunes","Edit",[{
        ID: idGC,
        CopropiedadID: coproID,
        Mes: mes,
        TotalGastos: total
      }]);
      console.log("✅ GastosComunes actualizado:", idGC, total);
    } else {
      // ➕ Crear nueva fila
      await appSheetCRUD("GastosComunes","Add",[{
        ID: idGC,
        CopropiedadID: coproID,
        Mes: mes,
        TotalGastos: total,
        Generado: new Date().toISOString()
      }]);
      console.log("➕ GastosComunes creado:", idGC, total);
    }
  } catch(err){
    console.error("❌ Error en actualizarGastosComunes:", err);
  }
}