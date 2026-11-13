'use client';
import { Plus } from 'lucide-react';
import { Panel,Table,Status,formatDate } from '../../../shared/ui/ModuleKit';

export default function IncidenciasPage({data,setModal}){
  const transferNames=new Map(data.transfers.map(transfer=>[transfer.id,transfer.code]));
  return <Panel title="Incidencias" description="Diferencias y observaciones que requieren seguimiento"
    actions={<button className="primary" type="button" onClick={()=>setModal('new-incident')}><Plus size={16}/> Registrar incidencia</button>}>
    <Table headers={['Tipo','Observación','Traspaso','Fecha','Estado']}
      rows={data.incidents.map(incident=>({
        key:incident.id,
        cells:[
          <strong key="tipo">{incident.type}</strong>,
          incident.notes,
          transferNames.get(incident.transferId)||'General',
          formatDate(incident.createdAt),
          <Status key="estado" value={incident.status}/>
        ]
      }))}
      empty="No hay incidencias."/>
  </Panel>;
}
