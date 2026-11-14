export const emptyWorkspaceData = {
  products: [],
  locations: [],
  stocks: [],
  inventoryObservations: [],
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
  audit: 'Auditoría',
  authorizations: 'Autorizaciones',
};
