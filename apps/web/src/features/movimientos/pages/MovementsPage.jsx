'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Empty, Hint, Metric, NextStep, Panel, Progress, SearchField, Status, Table, formatDate, stockAvailable, Unavailable } from '../../../shared/ui/ModuleKit';

export function MovementsPage({data}){
  const [q,setQ]=useState('');
  const events=data.transfers.flatMap(t=>{
    const reserved=t.lines.flatMap(l=>l.reservations.map(r=>({
      key:'reservation:'+r.id,type:'Reserva',sku:l.product.sku,quantity:r.quantity,
      from:t.origin.name,to:'Comprometido en origen',createdAt:r.createdAt,t
    })));
    const dispatches=t.dispatches.flatMap(d=>d.lines.map(l=>({
      key:'dispatch:'+d.id+':'+l.productId,type:'Despacho',sku:t.lines.find(x=>x.productId===l.productId)?.product.sku||l.productId,
      quantity:l.quantity,from:t.origin.name,to:'En traslado a '+t.destination.name,createdAt:d.createdAt,t
    })));
    const receipts=t.receipts.flatMap(r=>r.lines.map(l=>({
      key:'receipt:'+r.id+':'+l.productId,type:'Recepción aceptada',sku:t.lines.find(x=>x.productId===l.productId)?.product.sku||l.productId,
      quantity:l.accepted,from:'Mercancía presentada',to:t.destination.name,createdAt:r.createdAt,t
    })));
    return [...reserved,...dispatches,...receipts];
  }).filter(e=>(e.type+' '+e.sku+' '+e.t.code).toLowerCase().includes(q.toLowerCase()))
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return <>
    <Hint title="Secuencia de eventos logísticos, no libro mayor físico">Esta vista reconstruye reservas, despachos y aceptaciones desde los registros disponibles. Aún falta el modelo de movimiento de inventario completo y las relaciones despacho–recepción para una conciliación física exhaustiva.</Hint>
    <Panel title="Movimientos registrados" description="Eventos consultables por traspaso y SKU." actions={<NextStep label="Abrir operación de traspasos"/>}>
      <div className="module-toolbar"><SearchField value={q} onChange={setQ} placeholder="Folio, SKU o tipo de movimiento"/></div>
      <Table headers={['Tipo','Traspaso','SKU','Unidades','Origen','Destino o condición','Fecha']} rows={events.map(e=>({
        key:e.key,cells:[e.type,<Link key="column-1" className="text-link" href={'/traspasos/'+e.t.id}>{e.t.code}</Link>,
          e.sku,e.quantity,e.from,e.to,formatDate(e.createdAt)]
      }))} empty="No hay movimientos registrados con ese filtro."/>
    </Panel>
  </>;
}
