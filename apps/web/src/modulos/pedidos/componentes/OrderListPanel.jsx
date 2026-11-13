'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { OrderPlan } from '../componentes/OrderPlan';
import { lineHolds } from '../utils/impact';
import Link from 'next/link';
import styles from '../styles/OrderListPanel.module.css';
import { CreateRecordAction } from '../../../shared/workspace/componentes/CreateRecordAction';
import { CreateOrder } from '../componentes/CreateOrder';
import {
  Panel,
  Table,
  Status,
  formatDate,
  Progress,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

export function OrderListPanel() {
  const { data } = useWorkspace();
  const rows = data.orders.map((order) => ({
    key: order.id,
    cells: [
      <div key="folio">
        <Link className="text-link" href={'/pedidos/' + order.id}>
          {order.code}
        </Link>
        <small>{formatDate(order.createdAt)}</small>
      </div>,
      order.customer,
      <OrderPlan key="plan" order={order} />,
      order.destination.name,
      <div key="lineas">
        {order.lines.map((line) => (
          <div key={line.id} className={styles.subline}>
            {line.product.sku}: {line.required} u.{' '}
            {lineHolds(line).map((h) => (
              <small key={h.id}>
                {h.quantity} retenidas · {h.notes} · {h.assignedTo}
              </small>
            ))}
          </div>
        ))}
      </div>,
      <Progress
        key="avance"
        actual={sumField(order.lines, 'accepted')}
        total={sumField(order.lines, 'required')}
      />,
      <Status key="estado" value={order.status} />,
    ],
  }));
  return (
    <Panel
      title="Pedidos de clientes"
      description="Listos sólo cuando todas las líneas cumplen la cantidad aceptada"
      actions={
        <CreateRecordAction
          label=" Nuevo pedido"
          title=" Nuevo pedido"
          form={CreateOrder}
        />
      }
    >
      <Table
        headers={[
          'Folio',
          'Cliente',
          'Prioridad y compromiso',
          'Destino',
          'Productos',
          'Progreso',
          'Estado',
        ]}
        rows={rows}
        empty="No hay pedidos. Registra el primero."
      />
    </Panel>
  );
}
