export const emptyWorkspaceData = {
  products: [],
  locations: [],
  stocks: [],
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
  audit: 'Auditoría',
  authorizations: 'Autorizaciones',
};
