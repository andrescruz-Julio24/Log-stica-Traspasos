'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Panel,Table,Status,formatDate } from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';
import { TransferDetail } from '../components/TransferDetail';

export default function TraspasosPage({data,setModal,selected,setSelected,busy,act}){
  const current=data.transfers.find(t=>t.id===selected);
  return <Panel title="Traspasos" description="Reserva, despacho y recepción son operaciones distintas"
    actions={<button className="primary" type="button" onClick={()=>setModal('new-transfer')}><Plus size={16}/> Nuevo traspaso</button>}>
    <Table headers={['Folio','Ruta','Solicitado','Despachado','Aceptado','Estado','Acción']}
      rows={data.transfers.map(transfer=>({
        key:transfer.id,
        cells:[
          <div key="folio"><Link className="text-link" href={'/traspasos/'+transfer.id}>{transfer.code}</Link><small>{formatDate(transfer.createdAt)}</small></div>,
          <div key="ruta">{transfer.origin.name}<span className="muted"> → {transfer.destination.name}</span></div>,
          sumField(transfer.lines,'requested'),
          sumField(transfer.lines,'dispatched'),
          sumField(transfer.lines,'accepted'),
          <Status key="estado" value={transfer.status}/>,
          <button key="accion" type="button" className="secondary" onClick={()=>setSelected(selected===transfer.id?null:transfer.id)}>
            {selected===transfer.id?'Ocultar':'Gestionar'}
          </button>
        ]
      }))}
      empty="Crea un traspaso para comenzar."/>
    {current&&<TransferDetail transfer={current} orders={data.orders} busy={busy} onAction={act}/>}
  </Panel>;
}
