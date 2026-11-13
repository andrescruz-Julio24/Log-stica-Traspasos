'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { useState } from 'react';
import {
  Hint,
  Metric,
  NextStep,
  Panel,
  SearchField,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';
import { TransferLink } from '../../traspasos/componentes/TransferLink';
const locationRows = (data) => data.stocks || [];

export function ReservationsPage() {
  const { data } = useWorkspace();
  const [q, setQ] = useState('');
  const rows = (data.transfers || [])
    .flatMap((t) =>
      t.lines.flatMap((line) =>
        line.reservations.map((r) => ({
          key: r.id,
          transfer: t,
          product: line.product,
          quantity: r.quantity,
          active: r.quantity - r.released,
          orderLineId: r.orderLineId,
          createdAt: r.createdAt,
        })),
      ),
    )
    .filter((r) =>
      (r.transfer.code + ' ' + r.product.sku + ' ' + r.transfer.origin.name)
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  const active = sumField(rows, 'active');
  return (
    <>
      <div className="stats">
        <Metric
          label="Reservas registradas"
          value={rows.length}
          detail="Relaciones existentes en PostgreSQL"
        />
        <Metric
          label="Unidades aún reservadas"
          value={active}
          detail="Cantidad sin liberar por despacho"
        />
        <Metric
          label="Reservas vinculadas a clientes"
          value={rows.filter((r) => r.orderLineId).length}
          detail="Asignaciones asociadas a líneas de pedido"
        />
        <Metric
          label="Ubicaciones con stock"
          value={new Set(locationRows(data).map((s) => s.locationId)).size}
          detail="Alcance de la consulta actual"
        />
      </div>
      <Hint title="Reserva confirmada ≠ asignación prevista">
        La reserva física descuenta disponibilidad en el origen. La relación con
        un pedido de cliente no significa que su mercancía ya haya sido recibida
        en el destino.
      </Hint>
      <Panel
        title="Reservas por traspaso"
        description="Consulta de unidades comprometidas y cantidad liberada."
        actions={<NextStep label="Registrar una reserva" />}
      >
        <div className="module-toolbar">
          <SearchField value={q} onChange={setQ} />
        </div>
        <Table
          headers={[
            'Folio',
            'Producto',
            'Origen',
            'Reservado',
            'Activo',
            'Pedido cliente',
            'Fecha',
          ]}
          rows={rows.map((r) => ({
            key: r.key,
            cells: [
              <TransferLink key="column-1" t={r.transfer} />,
              r.product.sku,
              r.transfer.origin.name,
              r.quantity,
              r.active,
              r.orderLineId ? 'Vinculado' : 'Sin vincular',
              formatDate(r.createdAt),
            ],
          }))}
          empty="No se encontraron reservas."
        />
      </Panel>
    </>
  );
}
