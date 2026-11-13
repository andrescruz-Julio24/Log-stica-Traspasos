'use client';
import { activeReserved } from '../../../shared/utils/quantities';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import {
  Hint,
  NextStep,
  Panel,
  Status,
  Table,
} from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../../../shared/components/TransferLink';

export function PreparationPage() {
  const { data } = useWorkspace();
  const source = data.transfers.filter(
    (t) => !['CLOSED', 'CANCELLED'].includes(t.status),
  );
  const rows = source
    .flatMap((t) =>
      t.lines.map((l) => {
        const active = activeReserved(l);
        return {
          key: l.id,
          t,
          l,
          active,
          remaining: Math.max(0, l.requested - l.dispatched),
        };
      }),
    )
    .filter((row) => row.remaining > 0);
  return (
    <>
      <Hint title="Preparación operativa">
        Esta vista organiza lo solicitado, reservado y pendiente de despacho.
        Todavía no existe una confirmación de picking, escaneo de SKU ni
        evidencia por operario: esas etapas requieren contratos y autorizaciones
        adicionales.
      </Hint>
      <Panel
        title="Cola de preparación"
        description="Artículos pendientes de separar y despachar."
        actions={<NextStep label="Gestionar traspasos" />}
      >
        <Table
          headers={[
            'Traspaso',
            'SKU / Producto',
            'Origen',
            'Solicitado',
            'Reservado activo',
            'Por despachar',
            'Estado',
          ]}
          rows={rows.map((r) => ({
            key: r.key,
            cells: [
              <TransferLink key="column-1" t={r.t} />,
              <>
                <strong key="column-2">{r.l.product.sku}</strong>
                <small key="column-3">{r.l.product.name}</small>
              </>,
              r.t.origin.name,
              r.l.requested,
              r.active,
              r.remaining,
              <Status key="column-4" value={r.t.status} />,
            ],
          }))}
          empty="No hay traspasos pendientes de preparación."
        />
      </Panel>
    </>
  );
}
