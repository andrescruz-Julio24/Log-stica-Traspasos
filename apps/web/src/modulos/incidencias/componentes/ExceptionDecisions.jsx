'use client';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel, Table } from '../../../shared/ui/ModuleKit';
import { submit } from '../../../shared/services/apiClient';
import { types } from '../data/exceptionTypes';
export function ExceptionDecisions() {
  const { data, act, busy } = useWorkspace();
  return (
    <Panel title="Solicitudes y decisiones">
      <Table
        headers={['Operación', 'Registro', 'Solicitante', 'Motivo', 'Decisión']}
        rows={data.authorizations.map((r) => ({
          key: r.id,
          cells: [
            types[r.kind],
            r.targetId,
            r.requester,
            r.reason,
            r.status === 'PENDING' ? (
              <form
                key="decision"
                onSubmit={(e) => {
                  e.preventDefault();
                  const approve = e.nativeEvent.submitter.value === 'approve';
                  const reason = new FormData(e.currentTarget).get('reason');
                  act(() =>
                    submit('/authorizations/' + r.id + '/decision', {
                      reason,
                      approve,
                    }),
                  );
                }}
              >
                <input required name="reason" aria-label="Motivo de decisión" />
                <button value="approve" disabled={busy}>
                  Aprobar
                </button>
                <button value="deny" disabled={busy}>
                  Denegar
                </button>
              </form>
            ) : (
              r.status + ' · ' + r.approver + ' · ' + r.decision
            ),
          ],
        }))}
      />
    </Panel>
  );
}
