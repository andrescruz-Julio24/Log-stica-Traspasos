'use client';
import styles from '../styles/SupplierReceiptsPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';
import { CreateSupplierReceipt } from '../componentes/CreateSupplierReceipt';
import { InspectSupplierReceipt } from '../componentes/InspectSupplierReceipt';
import { ReturnSupplierBlocked } from '../componentes/ReturnSupplierBlocked';

const statuses = { OPEN: 'Por inspeccionar', PARTIAL: 'Recepción parcial', INSPECTED: 'Todo inspeccionado' };
export function SupplierReceiptsPage() {
  const { data } = useWorkspace();
  return <div className={styles.content}>
    <CreateSupplierReceipt />
    <Panel title="Ingresos e inspecciones de proveedores" description="La mercancía del proveedor ingresa a la existencia oficial únicamente cuando se registra su aceptación o bloqueo físico.">
      {data.supplierReceipts.map(receipt => <details key={receipt.id} className={styles.receipt}>
        <summary>
          <strong>{receipt.supplier}</strong> · {receipt.destination.name} · {formatDate(receipt.createdAt)}
          {' · '}<span className={styles.status}>{statuses[receipt.status]}</span>
        </summary>
        {receipt.reference && <p>Remisión: {receipt.reference}</p>}
        <Table headers={['Producto','Unidad','Declarado','Presentado','Aceptado','Bloqueado']}
          rows={receipt.lines.map(l => ({ key: l.id, cells: [
            l.product.name + ' · ' + l.product.sku, l.unit, String(l.expected),
            String(l.presented), String(l.accepted), String(l.blocked),
          ] }))}/>
        {receipt.status !== 'INSPECTED' && <InspectSupplierReceipt receipt={receipt}/>}
        <div className={styles.returns}>
          {receipt.lines.map(line => <ReturnSupplierBlocked key={line.id} line={line}/>)}
        </div>
        {receipt.inspections.length > 0 && <p className={styles.audit}>{receipt.inspections.length} inspección(es) registrada(s). La bitácora de auditoría conserva cada operación y responsable.</p>}
      </details>)}
      {!data.supplierReceipts.length && <p>Sin ingresos de proveedor capturados.</p>}
    </Panel>
  </div>;
}
