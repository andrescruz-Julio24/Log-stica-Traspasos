'use client';
import styles from '../styles/WeightOrdersPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, formatDate } from '../../../shared/ui/ModuleKit';
import { CreateWeightOrder } from '../componentes/CreateWeightOrder';
import { WeightOrderActions } from '../componentes/WeightOrderActions';
export function WeightOrdersPage() {
  const { data } = useWorkspace();
  return <div className={styles.content}>
    <Panel title="Pedidos comerciales por peso" description="T-18: conserva kg teóricos, cajas estimadas y kg reales; referencias documentales sin inferir precios.">
      <CreateWeightOrder />
    </Panel>
    <Panel title="Reservas, pesaje y despachos comerciales">
      {data.weightOrders.map(order=><details className={styles.order} key={order.id}>
        <summary>{order.code} · {order.customer} · {order.destination.name} · {formatDate(order.createdAt)}</summary>
        {order.weightLines.map(line=><WeightOrderActions key={line.id} order={order} line={line}/>)}
      </details>)}
      {!data.weightOrders.length && <p>Sin pedidos comerciales por kg.</p>}
    </Panel>
  </div>;
}
