// La comparación es orientativa: no convierte unidades ni propone ajustes de stock.
// Solo se compara con el saldo congelado en la captura de esa misma observación.
export function observationDifference(observation) {
  if (observation.unit !== 'PIEZA' || observation.stockPhysicalSnapshot === null
    || observation.stockPhysicalSnapshot === undefined) return null;
  const counted = Number(observation.quantity);
  if (!Number.isSafeInteger(counted)) return null;
  return counted - observation.stockPhysicalSnapshot;
}
