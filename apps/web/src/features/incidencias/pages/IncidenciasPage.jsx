'use client';
import { Plus } from 'lucide-react';
import { Status, Panel, Empty, formatDate as fmt } from '../../../shared/ui/ModuleKit';
export default function IncidenciasPage({data,setModal}){
  return (<Panel title="Incidencias" subtitle="Diferencias y observaciones que requieren seguimiento" action={<button className="primary" onClick={()=>setModal('new-incident')}><Plus size={16}/> Registrar incidencia</button>}>
        <div className="table-scroll"><table><thead><tr><th>Tipo</th><th>Observación</th><th>Traspaso</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{data.incidents.map(i=><tr key={i.id}><td><strong>{i.type}</strong></td><td>{i.notes}</td><td>{data.transfers.find(t=>t.id===i.transferId)?.code||'General'}</td><td>{fmt(i.createdAt)}</td><td><Status value={i.status}/></td></tr>)}</tbody></table>{!data.incidents.length&&<Empty>No hay incidencias.</Empty>}</div></Panel>);
}
