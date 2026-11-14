export const queries = {
  returns: { resources: ['commercial-returns', 'weight-orders'] },
  incidents: { resources: ['incidents', 'transfers', 'orders'] },
  authorizations: { resources: ['orders', 'transfers', 'authorizations'] },
  alerts: { resources: ['incidents', 'orders', 'transfers'], partial: true },
};
