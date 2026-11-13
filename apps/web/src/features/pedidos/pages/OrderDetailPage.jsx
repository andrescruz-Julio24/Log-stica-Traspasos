'use client';
import { OrderHistory } from '../components/OrderHistory';
import { lineHolds } from '../utils/impact';
import Link from 'next/link';
import {
  Empty,
  Hint,
  Metric,
  Panel,
  Progress,
  Status,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';
import {
  DetailHeader,
  BackLink,
} from '../../trazabilidad/components/DetailHeader';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
export default function OrderDetailPage({ id }) {
  const { data } = useWorkspace();
  const order = data.orders.find((o) => o.id === id);
  if (!order)
    return (
      <div className="standalone-loading">
        <Empty message="Pedido no encontrado." />
        {<BackLink href="/pedidos" label="pedidos" />}
      </div>
    );
  const reservations = data.transfers.flatMap((t) =>
    t.lines.flatMap((l) =>
      l.reservations
        .filter((r) => order.lines.some((ol) => ol.id === r.orderLineId))
        .map((r) => ({ t, l, r })),
    ),
  );
  const req = sumField(order.lines, 'required'),
    accepted = sumField(order.lines, 'accepted');
  return (
    <main className="detail-page">
      <DetailHeader
        title={order.code}
        subtitle={
          order.customer +
          ' · ' +
          order.destination.name +
          ' · ' +
          formatDate(order.createdAt)
        }
        href="/pedidos"
        backLabel="pedidos"
      />
      <div className="stats">
        <Metric
          label="Unidades requeridas"
          value={req}
          detail="Pedido comercial"
        />
        <Metric
          label="Aceptadas y asignadas"
          value={accepted}
          detail="Recepción validada"
        />
        <Metric
          label="Pendientes"
          value={Math.max(0, req - accepted)}
          detail="Aún no cubiertas"
        />
        <Metric
          label="Estado"
          value={<Status value={order.status} />}
          detail="Calculado desde el registro"
        />
      </div>
      <OrderHistory id={id} />
      <Hint title="Disponibilidad comercial">
        Un pedido está listo cuando todas sus líneas tienen unidades utilizables
        asignadas y se han liberado las retenciones. Consulta abajo el motivo y
        responsable por SKU.
      </Hint>
      <Panel
        title="Productos solicitados"
        description="Consulta detallada de abastecimiento por SKU."
      >
        <Table
          headers={[
            'SKU',
            'Producto',
            'Requerido',
            'Aceptado',
            'Faltante',
            'Retenciones abiertas',
            'Progreso',
          ]}
          rows={order.lines.map((l) => ({
            key: l.id,
            cells: [
              <strong key="column-1">{l.product.sku}</strong>,
              l.product.name,
              l.required,
              l.accepted,
              Math.max(0, l.required - l.accepted),
              lineHolds(l)
                .map(
                  (h) => h.quantity + ' u. · ' + h.notes + ' · ' + h.assignedTo,
                )
                .join('; ') || '—',
              <Progress
                key="column-2"
                actual={l.accepted}
                total={l.required}
              />,
            ],
          }))}
        />
      </Panel>
      <Panel
        title="Reservas y traspasos relacionados"
        description="Una reserva en origen no equivale a recepción en destino."
      >
        <Table
          headers={[
            'Traspaso',
            'SKU',
            'Cantidad prevista',
            'Reserva activa',
            'Estado',
          ]}
          rows={reservations.map(({ t, l, r }) => ({
            key: r.id,
            cells: [
              <Link
                key="column-1"
                href={'/traspasos/' + t.id}
                className="text-link"
              >
                {t.code}
              </Link>,
              l.product.sku,
              r.quantity,
              r.quantity - r.released,
              <Status key="column-2" value={t.status} />,
            ],
          }))}
          empty="No hay reservas asociadas a este pedido."
        />
      </Panel>
    </main>
  );
}
