export const queries = {
  dashboard: { resources: ['orders', 'transfers', 'incidents'] },
  audit: { resources: ['audit'] },
  reports: { resources: ['orders', 'transfers'] },
  search: {
    resources: ['bootstrap', 'orders', 'transfers', 'incidents'],
    partial: true,
  },
  admin: { resources: ['bootstrap'] },
};
