export const queries = {
  transfers: { resources: ['bootstrap', 'orders', 'transfers', 'trips'] },
  measuredTransfers: { resources: ['bootstrap', 'unit-stocks', 'measured-transfers', 'trips'] },
  transferDetail: { resources: ['transfers', 'incidents', 'audit'] },
  drivers: { resources: ['drivers', 'trips', 'orders', 'transfers'] },
  preparation: { resources: ['transfers'] },
  dispatches: { resources: ['transfers'] },
  transit: { resources: ['transfers'] },
  receipts: { resources: ['transfers'] },
};
