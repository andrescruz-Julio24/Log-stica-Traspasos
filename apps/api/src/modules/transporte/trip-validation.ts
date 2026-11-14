import { ensure } from '../../shared/domain/assertions';
import type { Tx } from '../../shared/database/transaction.service';

// El chofer efectivo se deriva del último evento: nunca se sobreescribe un relevo.
export async function validTripForDispatch(tx: Tx, tripId: string | undefined,
  destination: { transferId?: string; orderId?: string }) {
  if (!tripId) return null; // Compatibilidad con despachos anteriores al módulo de viajes.
  const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId },
    include: { assignments: { orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
      take: 1, include: { driver: true } } },
  });
  ensure(trip.status === 'ACTIVE', 'El viaje debe iniciar con chofer asignado antes de despachar');
  ensure((destination.transferId && trip.transferId === destination.transferId) ||
    (destination.orderId && trip.orderId === destination.orderId),
    'El viaje no corresponde a este traspaso/pedido');
  const assignment = trip.assignments[0];
  ensure(assignment && assignment.driver.enabled && assignment.driver.available,
    'Viaje sin chofer habilitado y disponible');
  ensure(!assignment.provisional || (assignment.validUntil &&
    assignment.validUntil.getTime() > Date.now()),
    'La autorización del chofer provisional está vencida');
  return trip;
}
