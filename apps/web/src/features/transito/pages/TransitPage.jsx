'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Empty, Hint, Metric, NextStep, Panel, Progress, SearchField, Status, Table, formatDate, stockAvailable, Unavailable } from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../../../shared/components/TransferLink';

export function TransitPage({data}){
  const active=data.transfers.filter(t=>['IN_TRANSIT','RECEIVING'].includes(t.status));
  const rows=active.flatMap(t=>t.lines.map(l=>{
    const presented=t.receipts.flatMap(r=>r.lines).filter(r=>r.productId===l.productId).reduce((n,r)=>n+r.presented,0);
    return {key:l.id,t,l,presented,unpresented:Math.max(0,l.dispatched-presented)};
  })).filter(r=>r.l.dispatched>0);
  return <>
    <Hint title="Seguimiento físico aún incompleto" warning>El MVP no registra vehículo, custodio, ubicación GPS ni vincula cada recepción a un despacho específico. La cantidad sin presentar es un saldo agregado por producto y traspaso; no prueba por sí sola dónde se encuentra físicamente la mercancía.</Hint>
    <Panel title="Traspasos con mercancía en movimiento" description="Conciliación agregada entre lo despachado y lo presentado en recepción." actions={<NextStep label="Ver movimientos"/>}>
      <Table headers={['Folio','Origen → Destino','SKU','Despachado','Presentado','Sin presentar','Estado']} rows={rows.map(r=>({key:r.key,cells:[<TransferLink key="column-1" t={r.t}/>,r.t.origin.name+' → '+r.t.destination.name,r.l.product.sku,r.l.dispatched,r.presented,<strong key="column-2">{r.unpresented}</strong>,<Status key="column-3" value={r.t.status}/>]}))} empty="No hay traspasos con tránsito pendiente según el estado registrado."/>
    </Panel>
  </>;
}
