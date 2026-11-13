export function deriveAlerts(data, q) {
  return [
    ...data.incidents
      .filter((i) => i.status === 'OPEN')
      .map((i) => ({
        key: 'incident:' + i.id,
        kind: 'Incidencia abierta',
        title: i.type,
        detail: i.notes,
        level: 'Crítica',
        when: i.createdAt,
        href: '/incidencias',
      })),
    ...data.transfers
      .filter((t) => t.status === 'RECEIVING')
      .map((t) => ({
        key: 'receiving:' + t.id,
        kind: 'Recepción por conciliar',
        title: t.code,
        detail: t.origin.name + ' → ' + t.destination.name,
        level: 'Revisión',
        when: t.createdAt,
        href: '/recepciones',
      })),
    ...data.orders
      .filter((o) => o.status === 'BLOCKED')
      .map((o) => ({
        key: 'held:' + o.id,
        kind: 'Pedido retenido',
        title: o.code + ' · ' + o.customer,
        detail: 'Revisar unidades y responsable por SKU',
        level: 'Bloqueante',
        when: o.createdAt,
        href: '/pedidos/' + o.id,
      })),
    ...data.orders
      .filter((o) => o.status === 'PARTIAL')
      .map((o) => ({
        key: 'order:' + o.id,
        kind: 'Abastecimiento parcial',
        title: o.code + ' · ' + o.customer,
        detail:
          'Faltantes: ' +
          o.lines.reduce(
            (n, l) => n + Math.max(0, l.required - l.accepted),
            0,
          ) +
          ' unidades',
        level: 'Pendiente',
        when: o.createdAt,
        href: '/pedidos',
      })),
  ].filter((a) =>
    (a.kind + ' ' + a.title + ' ' + a.detail)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
}
