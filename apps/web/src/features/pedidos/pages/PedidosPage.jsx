'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Panel, Table, Status, formatDate, Progress } from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

export default function PedidosPage({data,setModal}){
  const rows=data.orders.map(order=>({
    key:order.id,
    cells:[
      <div key="folio"><Link className="text-link" href={'/pedidos/'+order.id}>{order.code}</Link><small>{formatDate(order.createdAt)}</small></div>,
      order.customer,
      order.destination.name,
      <div key="lineas">{order.lines.map(line=><div key={line.id} className="subline">{line.product.sku}: {line.required} u.</div>)}</div>,
      <Progress key="avance" actual={sumField(order.lines,'accepted')} total={sumField(order.lines,'required')}/>,
      <Status key="estado" value={order.status}/>
    ]
  }));
  return <Panel title="Pedidos de clientes"
    description="Listos sólo cuando todas las líneas cumplen la cantidad aceptada"
    actions={<button className="primary" type="button" onClick={()=>setModal('new-order')}><Plus size={16}/> Nuevo pedido</button>}>
    <Table headers={['Folio','Cliente','Destino','Productos','Progreso','Estado']} rows={rows} empty="No hay pedidos. Registra el primero."/>
  </Panel>;
}
