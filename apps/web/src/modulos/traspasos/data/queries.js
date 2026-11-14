export const queries = {
  transfers: { resources: ['bootstrap', 'orders', 'transfers'] },
  measuredTransfers: { resources: ['bootstrap', 'unit-stocks', 'measured-transfers'] },
  transferDetail: { resources: ['transfers', 'incidents', 'audit'] },
  preparation: { resources: ['transfers'] },
  dispatches: { resources: ['transfers'] },
  transit: { resources: ['transfers'] },
  receipts: { resources: ['transfers'] },
};
