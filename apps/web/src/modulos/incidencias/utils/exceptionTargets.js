export function exceptionTargets(data) {
  const reservations = data.transfers.flatMap((t) =>
    t.lines.flatMap((l) =>
      l.reservations
        .filter((r) => r.quantity && !r.released)
        .map((r) => ({
          id: r.id,
          label:
            t.code +
            ' · ' +
            l.product.sku +
            ' · ' +
            r.quantity +
            ' u. · ' +
            r.id,
          product: l.productId,
          destination: t.destinationId,
        })),
    ),
  );
  const options = {
    CANCEL_ORDER: data.orders
      .filter((o) => o.status !== 'CANCELLED')
      .map((o) => ({ id: o.id, label: o.code + ' · ' + o.customer })),
    CLOSE_DIFFERENCE: data.transfers
      .filter((t) => t.status === 'RECEIVING')
      .map((t) => ({ id: t.id, label: t.code })),
    REASSIGN: reservations,
    REVERSE_RECEIPT: data.transfers.flatMap((t) =>
      t.receipts.flatMap((r) =>
        r.lines
          .filter((l) => !l.reversed && l.applied)
          .map((l) => ({
            id: l.id,
            label:
              t.code +
              ' · ' +
              r.id +
              ' · ' +
              l.productId +
              ' · ' +
              l.accepted +
              ' aceptadas',
          })),
      ),
    ),
  };
  return options;
}
