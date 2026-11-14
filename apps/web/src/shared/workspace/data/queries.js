export const emptyWorkspaceData = {
  products: [],
  locations: [],
  stocks: [],
  inventoryObservations: [],
  clientDeliveries: [],
  orders: [],
  transfers: [],
  incidents: [],
  authorizations: [],
  audit: [],
};

// Vistas de lectura que identifican explícitamente sus fuentes incompletas.
export const resourceNames = {
  orders: 'Pedidos',
  transfers: 'Traspasos',
  incidents: 'Incidencias',
  bootstrap: 'Catálogo e inventario',
  'inventory-observations': 'Conteos físicos y referencias',
  'client-deliveries': 'Entregas a clientes',
  audit: 'Auditoría',
  authorizations: 'Autorizaciones',
};
