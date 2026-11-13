export const queries = {
  transfers: { resources: ['bootstrap', 'orders', 'transfers'] },
  transferDetail: { resources: ['transfers', 'incidents', 'audit'] },
  preparation: { resources: ['transfers'] },
  dispatches: { resources: ['transfers'] },
  transit: { resources: ['transfers'] },
  receipts: { resources: ['transfers'] },
};
