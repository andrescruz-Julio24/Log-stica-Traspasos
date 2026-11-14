export const queries = {
  orders: {
    resources: ['bootstrap', 'orders'],
    partial: true,
    required: ['orders'],
  },
  orderDetail: { resources: ['orders', 'transfers', 'incidents'] },
  weightOrders: { resources: ['bootstrap', 'unit-stocks', 'weight-orders'] },
  clients: { resources: ['orders'] },
  cancellations: { resources: ['orders'] },
};
