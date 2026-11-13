'use client';
import styles from '../styles/DispatchesPage.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import {
  Metric,
  NextStep,
  Panel,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';
import { TransferLink } from '../componentes/TransferLink';

export function DispatchesPage() {
  const { data } = useWorkspace();
  const rows = data.transfers
    .flatMap((t) =>
      t.dispatches.map((d) => ({
        key: d.id,
        t,
        d,
        quantity: sumField(d.lines, 'quantity'),
      })),
    )
    .sort((a, b) => new Date(b.d.createdAt) - new Date(a.d.createdAt));
  return (
    <>
      <div className={`stats ${styles.summary}`}>
        <Metric
          label="Despachos registrados"
          value={rows.length}
          detail="Salidas físicas confirmadas"
        />
        <Metric
          label="Unidades enviadas"
          value={rows.reduce((n, x) => n + x.quantity, 0)}
          detail="Total en el periodo disponible"
        />
        <Metric
          label="Traspasos con despacho"
          value={new Set(rows.map((x) => x.t.id)).size}
          detail="Un traspaso admite varias salidas"
        />
        <Metric
          label="Pendientes de completar"
          value={
            data.transfers.filter((t) =>
              t.lines.some((l) => l.dispatched < l.requested),
            ).length
          }
          detail="Solicitado superior a enviado"
        />
      </div>
      <Panel
        title="Historial de despachos"
        description="Se registra la salida por despacho, no la solicitud del traspaso."
        actions={<NextStep label="Realizar despacho" />}
      >
        <Table
          headers={[
            'Identificador',
            'Traspaso',
            'Ruta',
            'Productos',
            'Unidades',
            'Fecha',
          ]}
          rows={rows.map((x) => ({
            key: x.key,
            cells: [
              x.key.slice(0, 10),
              <TransferLink key="column-1" t={x.t} />,
              x.t.origin.name + ' → ' + x.t.destination.name,
              x.d.lines
                .map(
                  (l) =>
                    x.t.lines.find((i) => i.productId === l.productId)?.product
                      .sku +
                    ' (' +
                    l.quantity +
                    ')',
                )
                .join(', '),
              x.quantity,
              formatDate(x.d.createdAt),
            ],
          }))}
          empty="Todavía no se ha despachado mercancía."
        />
      </Panel>
    </>
  );
}
