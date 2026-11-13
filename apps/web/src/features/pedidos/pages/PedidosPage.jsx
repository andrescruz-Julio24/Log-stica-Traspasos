'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Status, Panel, Empty, formatDate as fmt } from '../../../shared/ui/ModuleKit';
export default function PedidosPage({data,setModal}){
  return (<Panel title="Pedidos de clientes" subtitle="Listos únicamente cuando todas las líneas cumplen la cantidad aceptada" action={<button className="primary" onClick={()=>setModal('new-order')}><Plus size={16}/> Nuevo pedido</button>}>
        <div className="table-scroll"><table><thead><tr><th>Folio</th><th>Cliente</th><th>Destino</th><th>Productos</th><th>Progreso</th><th>Estado</th></tr></thead><tbody>{data.orders.map(o=><tr key={o.id}><td><Link href={"/pedidos/"+o.id} className="text-link">{o.code}</Link><small>{fmt(o.createdAt)}</small></td><td>{o.customer}</td><td>{o.destination.name}</td><td>{o.lines.map(l=><div key={l.id} className="subline">{l.product.sku}: {l.required} u.</div>)}</td><td>{o.lines.reduce((a,l)=>a+l.accepted,0)} / {o.lines.reduce((a,l)=>a+l.required,0)}</td><td><Status value={o.status}/></td></tr>)}</tbody></table>{!data.orders.length&&<Empty>No hay pedidos. Registra el primero.</Empty>}</div>
      </Panel>);
}
