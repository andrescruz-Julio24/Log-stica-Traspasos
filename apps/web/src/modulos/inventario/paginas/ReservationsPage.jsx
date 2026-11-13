'use client';
import styles from '../styles/ReservationsPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import {
  Hint,
  Metric,
  NextStep,
  Panel,
  SearchField,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../../traspasos/componentes/TransferLink';
import { useReservations } from '../hooks/useReservations';

export function ReservationsPage() {
  const { data } = useWorkspace();
  const { q, setQ, rows, active, linked, locations } = useReservations(data);
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
          value={linked}
          detail="Asignaciones asociadas a líneas de pedido"
        />
        <Metric
          label="Ubicaciones con stock"
          value={locations}
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
        <div className={`module-toolbar ${styles.toolbar}`}>
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
