'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import {
  Hint,
  NextStep,
  Panel,
  Status,
  Table,
} from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../componentes/TransferLink';

export function TransitPage() {
  const { data } = useWorkspace();
  const active = data.transfers.filter((t) =>
    ['IN_TRANSIT', 'RECEIVING'].includes(t.status),
  );
  const rows = active
    .flatMap((t) =>
      t.lines.map((l) => {
        const presented = t.receipts
          .flatMap((r) => r.lines)
          .filter((r) => !r.reversed && r.productId === l.productId)
          .reduce((n, r) => n + r.presented, 0);
        return {
          key: l.id,
          t,
          l,
          presented,
          unpresented: Math.max(0, l.dispatched - presented),
        };
      }),
    )
    .filter((r) => r.l.dispatched > 0);
  return (
    <>
      <Hint title="Seguimiento físico aún incompleto" warning>
        El saldo agrupa por producto las salidas y recepciones vigentes. El
        custodio y el conteo se registran por despacho. La ubicación física
        requiere confirmación del responsable.
      </Hint>
      <Panel
        title="Traspasos con mercancía en movimiento"
        description="Conciliación agregada entre lo despachado y lo presentado en recepción."
        actions={<NextStep label="Ver movimientos" />}
      >
        <Table
          headers={[
            'Folio',
            'Origen → Destino',
            'SKU',
            'Despachado',
            'Presentado',
            'Sin presentar',
            'Estado',
          ]}
          rows={rows.map((r) => ({
            key: r.key,
            cells: [
              <TransferLink key="column-1" t={r.t} />,
              r.t.origin.name + ' → ' + r.t.destination.name,
              r.l.product.sku,
              r.l.dispatched,
              r.presented,
              <strong key="column-2">{r.unpresented}</strong>,
              <Status key="column-3" value={r.t.status} />,
            ],
          }))}
          empty="No hay traspasos con tránsito pendiente según el estado registrado."
        />
      </Panel>
    </>
  );
}
