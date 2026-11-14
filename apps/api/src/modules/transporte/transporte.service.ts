import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { RegisterDriverDto, DriverAvailabilityDto, CreateTripDto, AssignDriverDto } from './dto/transporte.dto';

@Injectable()
export class TransporteService {
  constructor(private readonly db: PrismaService, private readonly tx: TransactionService) {}
  drivers() { return this.db.driverProfile.findMany({ orderBy: [{ enabled: 'desc' }, { fullName: 'asc' }] }); }
  trips() {
    return this.db.trip.findMany({
      include: { transfer: { select: { code: true } }, order: { select: { code: true } },
        assignments: { include: { driver: true }, orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }] } },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }
  register(body: RegisterDriverDto, key: string | undefined, actor: string) {
    return this.tx.idempotent('driver-create:' + actor, key, body, async tx => {
      const driver = await tx.driverProfile.create({ data: {
        fullName: body.fullName.trim(), category: body.category, authorizedBy: actor,
      } });
      await this.tx.auditTx(tx, 'DRIVER_REGISTERED', 'DriverProfile', driver.id, actor,
        { fullName: driver.fullName, category: body.category, approvedBy: actor });
      return driver;
    });
  }
  availability(id: string, body: DriverAvailabilityDto, key: string | undefined, actor: string) {
    return this.tx.idempotent('driver-availability:' + id, key, body, async tx => {
      const driver = await tx.driverProfile.findUniqueOrThrow({ where: { id } });
      const updated = await tx.driverProfile.update({ where: { id },
        data: { available: body.available } });
      await this.tx.auditTx(tx, 'DRIVER_AVAILABILITY_CHANGED', 'DriverProfile', id, actor,
        { before: driver.available, after: body.available, reason: body.reason.trim() });
      return updated;
    });
  }
  createTrip(body: CreateTripDto, key: string | undefined, actor: string) {
    if (Boolean(body.transferId) === Boolean(body.orderId))
      throw new BadRequestException('El viaje debe vincular exactamente un traspaso o un pedido');
    const start = new Date(body.plannedDepartureAt);
    const end = body.plannedArrivalAt ? new Date(body.plannedArrivalAt) : null;
    ensure(!end || end.getTime() >= start.getTime(), 'La llegada prevista debe ser posterior a la salida');
    return this.tx.idempotent('trip-create:' + actor, key, body, async tx => {
      if (body.transferId) await tx.transfer.findUniqueOrThrow({ where: { id: body.transferId } });
      if (body.orderId) await tx.customerOrder.findUniqueOrThrow({ where: { id: body.orderId } });
      const trip = await tx.trip.create({ data: { transferId: body.transferId || null,
        orderId: body.orderId || null, plannedDepartureAt: start, plannedArrivalAt: end, createdBy: actor } });
      await this.tx.auditTx(tx, 'TRIP_CREATED', 'Trip', trip.id, actor, {
        transferId: trip.transferId, orderId: trip.orderId, plannedDepartureAt: body.plannedDepartureAt,
        plannedArrivalAt: body.plannedArrivalAt ?? null,
      });
      return trip;
    });
  }
  assign(tripId: string, body: AssignDriverDto, key: string | undefined, actor: string) {
    const expiry = body.validUntil ? new Date(body.validUntil) : null;
    return this.tx.idempotent('trip-assign:' + tripId, key, body, async tx => {
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId },
        include: { assignments: { orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }], take: 1 } } });
      ensure(trip.status !== 'FINISHED', 'No puede modificarse un viaje terminado');
      const driver = await tx.driverProfile.findUniqueOrThrow({ where: { id: body.driverId } });
      ensure(driver.enabled && driver.available, 'Chofer deshabilitado o no disponible');
      ensure((driver.category === 'SUPPORT') === body.provisional,
        'Un sustituto requiere nombramiento provisional y un chofer regular no');
      ensure(!body.provisional || (expiry && expiry > new Date()),
        'La suplencia necesita autorización con vigencia futura');
      const existing = trip.assignments[0];
      ensure(!existing || existing.driverId !== driver.id,
        'El chofer ya se encuentra asignado a este viaje');
      // Impedir doble asignación simultánea: considerar el último relevo de cada viaje.
      const possible = await tx.trip.findMany({ where: { id: { not: tripId },
        status: { in: ['PLANNED','ACTIVE'] },
        assignments: { some: { driverId: driver.id } } },
        include: { assignments: { orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }], take: 1 } },
      });
      const overlap = possible.some(other => {
        if (other.assignments[0]?.driverId !== driver.id) return false;
        const aStart = trip.plannedDepartureAt.getTime(), bStart = other.plannedDepartureAt.getTime();
        const aEnd = trip.plannedArrivalAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bEnd = other.plannedArrivalAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return aStart <= bEnd && bStart <= aEnd;
      });
      ensure(!overlap, 'El chofer tiene otro viaje en el mismo horario');
      const assignment = await tx.driverAssignment.create({ data: {
        tripId, driverId: driver.id, provisional: body.provisional,
        validUntil: expiry, reason: body.reason.trim(), assignedBy: actor,
      } });
      await this.tx.auditTx(tx, existing ? 'DRIVER_REPLACED' : 'DRIVER_ASSIGNED',
        'Trip', tripId, actor, {
          fromDriverId: existing?.driverId || null, toDriverId: driver.id,
          provisional: body.provisional, validUntil: expiry?.toISOString() || null,
          reason: body.reason.trim(), effectiveAssignmentId: assignment.id,
        });
      return assignment;
    });
  }
  start(tripId: string, key: string | undefined, actor: string) {
    return this.tx.idempotent('trip-start:' + tripId, key, { tripId }, async tx => {
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId },
        include: { assignments: { orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
          take: 1, include: { driver: true } } } });
      ensure(trip.status === 'PLANNED', 'El viaje ya salió o terminó');
      const assigned = trip.assignments[0];
      ensure(assigned && assigned.driver.enabled && assigned.driver.available &&
        (!assigned.provisional || (assigned.validUntil && assigned.validUntil > new Date())),
        'No existe chofer autorizado y disponible para iniciar el viaje');
      const updated = await tx.trip.update({ where: { id: tripId },
        data: { status: 'ACTIVE', startedAt: new Date() } });
      await this.tx.auditTx(tx, 'TRIP_STARTED', 'Trip', tripId, actor,
        { driverId: assigned.driverId, assignmentId: assigned.id, provisional: assigned.provisional });
      return updated;
    });
  }
  finish(tripId: string, key: string | undefined, actor: string) {
    return this.tx.idempotent('trip-finish:' + tripId, key, { tripId }, async tx => {
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId } });
      ensure(trip.status === 'ACTIVE', 'Solo un viaje iniciado se puede concluir');
      const updated = await tx.trip.update({ where: { id: tripId },
        data: { status: 'FINISHED', finishedAt: new Date() } });
      await this.tx.auditTx(tx, 'TRIP_FINISHED', 'Trip', tripId, actor, {});
      return updated;
    });
  }
}
