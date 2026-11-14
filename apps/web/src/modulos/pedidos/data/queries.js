export const queries = {
  orders: {
    resources: ['bootstrap', 'orders'],
    partial: true,
    required: ['orders'],
  },
  orderDetail: { resources: ['orders', 'transfers', 'incidents', 'client-deliveries'] },
  clients: { resources: ['orders'] },
  cancellations: { resources: ['orders'] },
};
