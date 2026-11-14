// El primer destino de cada área aparece en el menú principal.
export const areas = [
  [
    { key: 'dashboard', label: 'Resumen', href: '/' },
    { key: 'search', label: 'Búsqueda global', href: '/buscar' },
    { key: 'reports', label: 'Reportes', href: '/reportes' },
    { key: 'audit', label: 'Auditoría', href: '/auditoria' },
    { key: 'admin', label: 'Administración', href: '/administracion' },
  ],
  [
    { key: 'orders', label: 'Pedidos de clientes', href: '/pedidos' },
    { key: 'clients', label: 'Clientes', href: '/clientes' },
    { key: 'cancellations', label: 'Cancelaciones', href: '/cancelaciones' },
  ],
  [
    { key: 'transfers', label: 'Traspasos', href: '/traspasos' },
    { key: 'measuredTransfers', label: 'Traspasos por KG y caja', href: '/traspasos-peso' },
    { key: 'preparation', label: 'Preparación', href: '/preparacion' },
    { key: 'dispatches', label: 'Despachos', href: '/despachos' },
    { key: 'transit', label: 'En tránsito', href: '/transito' },
    { key: 'receipts', label: 'Recepciones', href: '/recepciones' },
  ],
  [
    { key: 'stock', label: 'Inventario', href: '/inventario' },
    { key: 'counts', label: 'Conteos y referencias', href: '/conteos' },
    { key: 'suppliers', label: 'Ingresos de proveedores', href: '/proveedores' },
    { key: 'reservations', label: 'Reservas', href: '/reservas' },
    { key: 'movements', label: 'Movimientos', href: '/movimientos' },
  ],
  [
    { key: 'incidents', label: 'Incidencias', href: '/incidencias' },
    { key: 'alerts', label: 'Alertas', href: '/alertas' },
    { key: 'authorizations', label: 'Autorizaciones', href: '/autorizaciones' },
  ],
];
export function areaFor(section) {
  return areas.find((area) => area.some((item) => item.key === section));
}
