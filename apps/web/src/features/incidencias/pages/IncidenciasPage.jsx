'use client';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { CreateRecordAction } from '../../workspace/components/CreateRecordAction';
import { CreateIncident } from '../components/CreateIncident';
import { Panel, Table, Status, formatDate } from '../../../shared/ui/ModuleKit';

export default function IncidenciasPage() {
  const { data } = useWorkspace();
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
        headers={['Tipo', 'Observación', 'Traspaso', 'Fecha', 'Estado']}
        rows={data.incidents.map((incident) => ({
          key: incident.id,
          cells: [
            <strong key="tipo">{incident.type}</strong>,
            incident.notes,
            transferNames.get(incident.transferId) || 'General',
            formatDate(incident.createdAt),
            <Status key="estado" value={incident.status} />,
          ],
        }))}
        empty="No hay incidencias."
      />
    </Panel>
  );
}
