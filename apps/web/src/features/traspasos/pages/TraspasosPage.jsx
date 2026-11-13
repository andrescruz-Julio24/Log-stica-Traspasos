'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Status, Panel, Empty, formatDate as fmt } from '../../../shared/ui/ModuleKit';
import { TransferDetail } from '../components/TransferDetail';
export default function TraspasosPage({data,setModal,selected,setSelected,busy,act}){
  return (<Panel title="Traspasos" subtitle="Reserva, despacho y recepción son operaciones distintas" action={<button className="primary" onClick={()=>setModal('new-transfer')}><Plus size={16}/> Nuevo traspaso</button>}>
        <div className="table-scroll"><table><thead><tr><th>Folio</th><th>Ruta</th><th>Solicitado</th><th>Despachado</th><th>Aceptado</th><th>Estado</th><th></th></tr></thead><tbody>{data.transfers.map(t=><tr key={t.id}><td><Link href={"/traspasos/"+t.id} className="text-link">{t.code}</Link><small>{fmt(t.createdAt)}</small></td><td>{t.origin.name}<br/><span className="muted">→ {t.destination.name}</span></td><td>{t.lines.reduce((n,l)=>n+l.requested,0)}</td><td>{t.lines.reduce((n,l)=>n+l.dispatched,0)}</td><td>{t.lines.reduce((n,l)=>n+l.accepted,0)}</td><td><Status value={t.status}/></td><td><button className="secondary" onClick={()=>setSelected(selected===t.id?null:t.id)}>{selected===t.id?'Ocultar':'Gestionar'}</button></td></tr>)}</tbody></table>{!data.transfers.length&&<Empty>Crea un traspaso para comenzar.</Empty>}</div>
        {selected&&data.transfers.some(t=>t.id===selected)&&<TransferDetail transfer={data.transfers.find(t=>t.id===selected)} orders={data.orders} busy={busy} onAction={act}/>}
      </Panel>);
}
