export function orderTrace(order, transfers, incidents) {
  const reservations = transfers.flatMap((t) =>
    t.lines.flatMap((l) =>
      l.reservations
        .filter((r) => order.lines.some((ol) => ol.id === r.orderLineId))
        .map((r) => ({ t, l, r })),
    ),
  );
  const orderLines = new Set(order.lines.map((line) => line.id));
  const shortages = transfers.flatMap((t) =>
    t.dispatches.flatMap((d) =>
      d.lines.flatMap((l) => {
        const missing = l.allocations.filter(
          (a) =>
            orderLines.has(a.reservation.orderLineId) &&
            a.quantity > a.accepted,
        );
        if (!missing.length) return [];
        const sku = t.lines.find((x) => x.productId === l.productId)?.product
          .sku;
        return incidents
          .filter(
            (i) =>
              i.status === 'OPEN' &&
              i.type === 'FALTANTE' &&
              i.dispatchId === d.id &&
              i.sku === sku,
          )
          .map((i) => ({
            key: i.id,
            cells: [
              t.code,
              sku,
              i.quantity,
              i.assignedTo || 'Pendiente de asignar',
              i.notes,
            ],
          }));
      }),
    ),
  );
  return { reservations, shortages };
}
