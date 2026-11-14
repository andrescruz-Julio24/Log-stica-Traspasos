'use client';
import styles from '../styles/InventoryObservationsPage.module.css';
import { CaptureInventoryObservation } from '../componentes/CaptureInventoryObservation';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';
import { submitOnce } from '../../../shared/services/apiClient';

const source = { PAPER: 'Papel', EXCEL: 'Excel estimado', DIGITAL: 'Digital' };
const method = { COUNT: 'Conteo', WEIGHT: 'Pesaje', ESTIMATE: 'Estimación' };

export function InventoryObservationsPage() {
  const { data, busy, act } = useWorkspace();
  return (
    <div className={styles.content}>
      <CaptureInventoryObservation />
      <Panel title="Observaciones y validaciones" description="Distingue observaciones estimadas de mediciones físicas confirmadas. Las diferencias requieren un ajuste autorizado independiente.">
        <Table
          headers={['Producto', 'Ubicación', 'Medición', 'Fuente / método', 'Observado', 'Registró', 'Verificación']}
          rows={data.inventoryObservations.map((o) => ({
            key: o.id,
            cells: [
              <strong key="sku">{o.product.sku}</strong>,
              o.location.name,
              o.quantity + ' ' + o.unit,
              source[o.source] + ' · ' + method[o.method],
              formatDate(o.observedAt),
              o.recordedBy,
              o.status === 'VERIFIED'
                ? <span key="verified" className={styles.verified}>Verificado por {o.verifiedBy}</span>
                : o.source !== 'EXCEL' && o.method !== 'ESTIMATE'
                  ? <button key="verify" disabled={busy} onClick={() => act(() => submitOnce('/inventory-observations/' + o.id + '/verify', {}))}>Validar medición</button>
                  : <span key="estimated" className={styles.estimated}>Referencia no verificada</span>,
            ],
          }))}
          empty="No hay observaciones registradas."
        />
      </Panel>
    </div>
  );
}
