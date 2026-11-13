export const queries = {
  incidents: { resources: ['incidents', 'transfers', 'orders'] },
  authorizations: { resources: ['orders', 'transfers', 'authorizations'] },
  alerts: { resources: ['incidents', 'orders', 'transfers'], partial: true },
};
