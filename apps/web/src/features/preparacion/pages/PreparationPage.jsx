'use client';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { activeReserved } from '../../../shared/utils/quantities';
import { Panel, Table } from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../../../shared/components/TransferLink';
import { submit } from '../../../shared/services/apiClient';

function PickForm({ transfer, line }) {
  const { act, busy } = useWorkspace();
  function save(e) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    act(() =>
      submit('/transfers/' + transfer.id + '/picking', {
        transferLineId: line.id,
        quantity: Number(fields.get('quantity')),
        version: line.pickVersion,
        location: fields.get('location'),
        note: fields.get('note'),
      }),
    );
  }
  return (
    <form className="stack" onSubmit={save}>
      <label>
        Unidades separadas ahora
        <input
          name="quantity"
          type="number"
          min="0"
          max={activeReserved(line)}
          required
          defaultValue={line.picked}
        />
      </label>
      <label>
        Ubicación de picking
        <input name="location" required placeholder="Pasillo o anaquel" />
      </label>
      <label>
        Motivo si hay diferencia
        <input name="note" />
      </label>
      <button disabled={busy || !activeReserved(line)}>Confirmar conteo</button>
    </form>
  );
}
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
  );
}
