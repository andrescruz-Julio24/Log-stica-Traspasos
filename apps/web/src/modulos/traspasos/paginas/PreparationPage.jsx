'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { activeReserved } from '../../../shared/utils/quantities';
import { Panel, Table } from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../componentes/TransferLink';
import { PickForm } from '../componentes/PickForm';
import styles from '../styles/PreparationPage.module.css';

export function PreparationPage() {
  const { data } = useWorkspace();
  const rows = data.transfers
    .filter((t) => !['CLOSED', 'CANCELLED'].includes(t.status))
    .flatMap((t) =>
      t.lines
        .filter((l) => l.requested > l.dispatched)
        .map((l) => ({
          key: l.id,
          cells: [
            <TransferLink key="t" t={t} />,
            l.product.sku,
            t.origin.name,
            activeReserved(l),
            l.picked,
            <PickForm key={l.id + ':' + l.pickVersion} transfer={t} line={l} />,
          ],
        })),
    );
  return (
    <div className={styles.page}>
      <Panel
      title="Preparación física"
      description="Cuenta las unidades separadas que siguen en origen. Cada despacho consume el conteo confirmado."
    >
      <Table
        headers={[
          'Traspaso',
          'SKU',
          'Origen',
          'Reservadas',
          'Separadas',
          'Verificación',
        ]}
        rows={rows}
      />
      </Panel>
    </div>
  );
}
