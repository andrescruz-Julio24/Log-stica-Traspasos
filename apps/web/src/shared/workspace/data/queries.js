export const emptyWorkspaceData = {
  products: [],
  locations: [],
  stocks: [],
  inventoryObservations: [],
  supplierReceipts: [],
  measuredTransfers: [],
  unitStocks: [],
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
  'supplier-receipts': 'Ingresos de proveedores',
  'measured-transfers': 'Traspasos por unidades medidas',
  'unit-stocks': 'Existencias por unidades',
  'client-deliveries': 'Entregas a clientes',
  audit: 'Auditoría',
  authorizations: 'Autorizaciones',
};
