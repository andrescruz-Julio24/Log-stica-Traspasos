'use client';
import { OrderListPanel } from '../componentes/OrderListPanel';
import { ReplenishmentPanel } from '../componentes/ReplenishmentPanel';
import { ViewBoundary } from '../../../shared/workspace/componentes/ViewBoundary';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
export default function PedidosPage() {
  const { retry } = useWorkspace();
  return (
    <>
      <ViewBoundary label="La tabla de pedidos" reload={() => retry('orders')}>
        <OrderListPanel />
      </ViewBoundary>
      <ViewBoundary
        label="El panel de reabastecimiento"
        reload={() => retry('orders')}
      >
        <ReplenishmentPanel />
      </ViewBoundary>
    </>
  );
}
