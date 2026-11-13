/** Reconstruye el historial logístico disponible, sin representar un libro mayor físico. */
export function movementEvents(transfers, q) {
  const events = transfers
    .flatMap((t) => {
      const reserved = t.lines.flatMap((l) =>
        l.reservations.map((r) => ({
          key: 'reservation:' + r.id,
          type: 'Reserva',
          sku: l.product.sku,
          quantity: r.quantity,
          from: t.origin.name,
          to: 'Comprometido en origen',
          createdAt: r.createdAt,
          t,
        })),
      );
      const dispatches = t.dispatches.flatMap((d) =>
        d.lines.map((l) => ({
          key: 'dispatch:' + d.id + ':' + l.productId,
          type: 'Despacho',
          sku:
            t.lines.find((x) => x.productId === l.productId)?.product.sku ||
            l.productId,
          quantity: l.quantity,
          from: t.origin.name,
          to: 'En traslado a ' + t.destination.name,
          createdAt: d.createdAt,
          t,
        })),
      );
      const receipts = t.receipts.flatMap((r) =>
        r.lines.map((l) => ({
          key: 'receipt:' + r.id + ':' + l.productId,
          type: l.reversed ? 'Recepción compensada' : 'Recepción aceptada',
          sku:
            t.lines.find((x) => x.productId === l.productId)?.product.sku ||
            l.productId,
          quantity: l.accepted,
          from: 'Mercancía presentada',
          to: t.destination.name,
          createdAt: r.createdAt,
          t,
        })),
      );
      return [...reserved, ...dispatches, ...receipts];
    })
    .filter((e) =>
      (e.type + ' ' + e.sku + ' ' + e.t.code)
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return events;
}
