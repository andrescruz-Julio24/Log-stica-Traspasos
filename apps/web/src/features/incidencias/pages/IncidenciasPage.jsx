'use client';
import { submit } from '../../../shared/services/apiClient';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { CreateRecordAction } from '../../workspace/components/CreateRecordAction';
import { CreateIncident } from '../components/CreateIncident';
import { Panel, Table, Status, formatDate } from '../../../shared/ui/ModuleKit';

export default function IncidenciasPage() {
  const { data, busy, act } = useWorkspace();
  const transferNames = new Map(
    data.transfers.map((transfer) => [transfer.id, transfer.code]),
  );
  return (
    <Panel
      title="Incidencias"
      description="Diferencias y observaciones que requieren seguimiento"
      actions={
        <CreateRecordAction
          label=" Registrar incidencia"
          title=" Registrar incidencia"
          form={CreateIncident}
        />
      }
    >
      <Table
        headers={[
          'Tipo',
          'Observación',
          'Traspaso',
          'Fecha',
          'Estado',
          'Seguimiento',
        ]}
        rows={data.incidents.map((incident) => ({
          key: incident.id,
          cells: [
            <strong key="tipo">{incident.type}</strong>,
            incident.notes,
            transferNames.get(incident.transferId) || 'General',
            formatDate(incident.createdAt),
            <Status key="estado" value={incident.status} />,
            <div key="seguimiento">
              {[
                incident.sku,
                incident.quantity,
                incident.location,
                incident.custodian,
                incident.assignedTo && 'Seguimiento: '+incident.assignedTo,
                incident.disposition,
                incident.evidence,
              ]
                .filter(Boolean)
                .join(' · ')}
              {incident.status === 'OPEN' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const reason = f.get('reason');
                    const disposition = f.get('disposition');
                    act(() =>
                      submit('/incidents/' + incident.id + '/resolve', {
                        reason,
                        ...(disposition ? { disposition } : {}),
                      }),
                    );
                  }}
                >
                  {incident.allocationId && (
                    <label>
                      Destino
                      <select name="disposition" defaultValue="" required>
                        <option value="">Seleccionar</option>
                        <option value="RELEASE">Liberar para preparar</option>
                        <option value="QUARANTINE">
                          Separar en cuarentena y reabastecer
                        </option>
                      </select>
                    </label>
                  )}
                  <input name="reason" required aria-label="Resolución" />
                  <button disabled={busy}>Resolver</button>
                </form>
              ) : (
                <>
                  {incident.resolution}
                  {incident.disposition === 'QUARANTINE' &&
                    (incident.returnedAt ? (
                      <small>Devuelta: {formatDate(incident.returnedAt)}</small>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const reason = new FormData(e.currentTarget).get(
                            'reason',
                          );
                          act(() =>
                            submit('/incidents/' + incident.id + '/return', {
                              reason,
                            }),
                          );
                        }}
                      >
                        <input
                          required
                          name="reason"
                          aria-label="Destino, receptor y evidencia de entrega"
                        />
                        <button disabled={busy}>
                          Confirmar entrega de devolución
                        </button>
                      </form>
                    ))}
                </>
              )}
            </div>,
          ],
        }))}
        empty="No hay incidencias."
      />
    </Panel>
  );
}
