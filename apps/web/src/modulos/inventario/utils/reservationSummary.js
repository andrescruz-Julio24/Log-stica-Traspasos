import { sumField } from '../../../shared/utils/quantities';

/** Calcula cantidades y relaciones visibles respetando el filtro seleccionado. */
export function reservationSummary(data, q) {
  const rows = (data.transfers || [])
    .flatMap((t) =>
      t.lines.flatMap((line) =>
        line.reservations.map((r) => ({
          key: r.id,
          transfer: t,
          product: line.product,
          quantity: r.quantity,
          active: r.quantity - r.released,
          orderLineId: r.orderLineId,
          createdAt: r.createdAt,
        })),
      ),
    )
    .filter((r) =>
      (r.transfer.code + ' ' + r.product.sku + ' ' + r.transfer.origin.name)
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  const active = sumField(rows, 'active');
  return {
    rows,
    active,
    linked: rows.filter((r) => r.orderLineId).length,
    locations: new Set((data.stocks || []).map((s) => s.locationId)).size,
  };
}
