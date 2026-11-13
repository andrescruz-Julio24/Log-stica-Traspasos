'use client';
import { Panel, Table } from '../../../shared/ui/ModuleKit';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { submit } from '../../../shared/services/apiClient';
export function CancellationsPage() {
  const { data, busy, act } = useWorkspace();
  return (
    <Panel
      title="Cancelación de pedidos"
      description="La solicitud pasa a Autorizaciones. La mercancía despachada conserva su custodia."
    >
      <Table
        headers={['Folio', 'Cliente', 'Estado', 'Solicitud']}
        rows={data.orders.map((o) => ({
          key: o.id,
          cells: [
            o.code,
            o.customer,
            o.status,
            o.status === 'CANCELLED' ? (
              'Cancelado'
            ) : (
              <form
                key="solicitar"
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = new FormData(e.currentTarget).get('reason');
                  act(() =>
                    submit('/authorizations', {
                      kind: 'CANCEL_ORDER',
                      targetId: o.id,
                      reason,
                    }),
                  );
                }}
              >
                <input required aria-label="Motivo" name="reason" />
                <button disabled={busy}>Solicitar cancelación</button>
              </form>
            ),
          ],
        }))}
      />
    </Panel>
  );
}
