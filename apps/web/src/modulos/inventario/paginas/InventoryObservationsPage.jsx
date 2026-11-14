'use client';
import styles from '../styles/InventoryObservationsPage.module.css';
import { CaptureInventoryObservation } from '../componentes/CaptureInventoryObservation';
import { ApplyInventoryCount } from '../componentes/ApplyInventoryCount';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';
import { submitOnce } from '../../../shared/services/apiClient';
import { observationDifference } from '../utils/countDifference';

const source = { PAPER: 'Papel', EXCEL: 'Excel estimado', DIGITAL: 'Digital' };
const method = { COUNT: 'Conteo', WEIGHT: 'Pesaje', ESTIMATE: 'Estimación' };

export function InventoryObservationsPage() {
  const { data, busy, act } = useWorkspace();
  return (
    <div className={styles.content}>
      <CaptureInventoryObservation />
      <Panel title="Observaciones y validaciones" description="Historial digital de conteos. La validación comprueba la medición; aplicar un ajuste actualiza el saldo oficial con causa y auditoría.">
        <Table
          headers={['Producto', 'Ubicación', 'Medición', 'Fuente / método', 'Diferencia orientativa', 'Observado', 'Registró', 'Estado del inventario']}
          rows={data.inventoryObservations.map((o) => ({
            key: o.id,
            cells: [
              <strong key="sku">{o.product.sku}</strong>,
              o.location.name,
              o.quantity + ' ' + o.unit,
              source[o.source] + ' · ' + method[o.method],
              (() => {
                const delta = observationDifference(o);
                if (delta === null) return 'Sin unidad comparable';
                if (delta === 0) return 'Coincide con captura digital';
                return <span key="difference" className={styles.difference}>{o.source === 'EXCEL' ? 'Referencia: ' : 'Revisar: '}{delta > 0 ? '+' : ''}{delta} piezas</span>;
              })(),
              formatDate(o.observedAt),
              o.recordedBy,
              o.appliedAt
                ? <span key="applied" className={styles.verified}>Aplicado por {o.appliedBy} · {formatDate(o.appliedAt)}</span>
                : o.status === 'VERIFIED'
                  ? o.source === 'DIGITAL' && (o.method === 'COUNT' || (o.unit === 'KG' && o.method === 'WEIGHT')) && (o.unit === 'KG' || Number.isSafeInteger(Number(o.quantity)))
                    ? <ApplyInventoryCount key="apply" observation={o} />
                    : <span key="verified" className={styles.verified}>Medición validada; ajuste no disponible para esta unidad</span>
                  : o.source === 'DIGITAL' && o.method !== 'ESTIMATE'
                    ? <button key="verify" disabled={busy} onClick={() => act(() => submitOnce('/inventory-observations/' + o.id + '/verify', {}))}>Validar medición</button>
                    : <span key="estimated" className={styles.estimated}>Referencia no verificable</span>,
            ],
          }))}
          empty="No hay observaciones registradas."
        />
      </Panel>
    </div>
  );
}
