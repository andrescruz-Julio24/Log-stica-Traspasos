import { sumField } from '../../../shared/utils/quantities';
import { reportStatuses } from '../data/reportStatuses';

export function reportMetrics(orders, transfers) {
  const requested = transfers.reduce((total, t) => total + sumField(t.lines, 'requested'), 0);
  const dispatched = transfers.reduce((total, t) => total + sumField(t.lines, 'dispatched'), 0);
  const accepted = transfers.reduce((total, t) => total + sumField(t.lines, 'accepted'), 0);
  const statusCounts = Object.fromEntries(reportStatuses.map(({ key }) => [key, orders.filter((o) => o.status === key).length]));
  return { orders, transfers, requested, dispatched, accepted, statusCounts, totalOrders: orders.length };
}
