// Un SKU solo desbloquea un pedido si es el único renglón faltante y llega al destino del pedido.
export function replenishmentImpact(orders) {
  const groups = new Map();
  for (const order of orders) {
    if (order.status !== 'PENDING' && order.status !== 'PARTIAL') continue;
    const missing = order.lines.filter((l) => l.accepted < l.required);
    if (missing.length !== 1) continue;
    const [line] = missing,
      key = JSON.stringify([order.destinationId, line.productId]);
    const group = groups.get(key) ?? {
      key,
      sku: line.product.sku,
      destination: order.destination.name,
      units: 0,
      orders: [],
      urgent: 0,
    };
    group.units += line.required - line.accepted;
    group.orders.push(order.code);
    if (order.priority === 'URGENT') group.urgent++;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.orders.length - a.orders.length ||
      b.urgent - a.urgent ||
      a.units - b.units ||
      a.key.localeCompare(b.key),
  );
}
export function lineHolds(line) {
  return line.reservations.flatMap((r) =>
    r.allocations.flatMap((a) => a.holds),
  );
}
