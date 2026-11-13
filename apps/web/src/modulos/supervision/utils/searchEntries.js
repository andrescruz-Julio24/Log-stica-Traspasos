/** Búsqueda sobre los recursos cargados; no consulta registros fuera de la API. */
export function searchEntries(data, term) {
  const normalized = term.toLocaleLowerCase('es-MX').trim();
  const entries = [
    ...data.orders.map((x) => ({
      key: 'order:' + x.id,
      type: 'Pedido',
      title: x.code,
      detail: x.customer + ' · ' + x.destination.name,
      href: '/pedidos',
    })),
    ...data.transfers.map((x) => ({
      key: 'transfer:' + x.id,
      type: 'Traspaso',
      title: x.code,
      detail: x.origin.name + ' → ' + x.destination.name,
      href: '/traspasos',
    })),
    ...data.products.map((x) => ({
      key: 'product:' + x.id,
      type: 'Producto',
      title: x.sku,
      detail: x.name,
      href: '/inventario',
    })),
    ...data.incidents.map((x) => ({
      key: 'incident:' + x.id,
      type: 'Incidencia',
      title: x.type,
      detail: x.notes,
      href: '/incidencias',
    })),
  ]
    .filter(
      (x) =>
        normalized &&
        (x.title + ' ' + x.detail + ' ' + x.type)
          .toLocaleLowerCase('es-MX')
          .includes(normalized),
    )
    .slice(0, 100);
  return entries;
}
