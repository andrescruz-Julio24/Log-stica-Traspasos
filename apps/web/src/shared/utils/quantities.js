/** Funciones puras: los saldos siguen siendo validados en NestJS. */
export function sumField(items, field) {
  return items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
}
export function stockAvailable(stock) {
  return Math.max(0, stock.physical - stock.reserved - stock.blocked);
}
export function percentage(actual, total) {
  return total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
}

export function activeReserved(line) {
  return line.reservations.reduce((sum, r) => sum + r.quantity - r.released, 0);
}
