'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Empty, Hint, Metric, NextStep, Panel, Progress, SearchField, Status, Table, formatDate, stockAvailable, Unavailable } from '../../../shared/ui/ModuleKit';
import { TransferLink } from '../../../shared/components/TransferLink';

export function ReceiptsPage({data}){
  const rows=data.transfers.flatMap(t=>t.receipts.flatMap(r=>r.lines.map(l=>({key:l.id,t,r,l,product:t.lines.find(x=>x.productId===l.productId)?.product})))).sort((a,b)=>new Date(b.r.createdAt)-new Date(a.r.createdAt));
  return <>
    <div className="stats"><Metric label="Líneas recibidas" value={rows.length} detail="Registros de recepción verificable"/><Metric label="Presentadas" value={rows.reduce((n,x)=>n+x.l.presented,0)} detail="Cantidad física reportada"/><Metric label="Aceptadas" value={rows.reduce((n,x)=>n+x.l.accepted,0)} detail="Se incorpora al destino"/><Metric label="Rechazadas" value={rows.reduce((n,x)=>n+x.l.rejected,0)} detail="No aumenta inventario disponible"/></div>
    <Hint title="Regla de recepción">Para cada línea, presentado = aceptado + rechazado. Una aceptación no borra faltantes, excedentes o incidencias previas.</Hint>
    <Panel title="Recepciones verificadas" description="Diferencia explícita entre presentado, aceptado y rechazado." actions={<NextStep label="Registrar recepción"/>}>
      <Table headers={['Traspaso','SKU','Presentado','Aceptado','Rechazado','Destino','Fecha']} rows={rows.map(x=>({key:x.key,cells:[<TransferLink t={x.t}/>,x.product?.sku||x.l.productId,x.l.presented,<span className="positive">{x.l.accepted}</span>,x.l.rejected,x.t.destination.name,formatDate(x.r.createdAt)]}))} empty="Aún no se han registrado recepciones."/>
    </Panel>
  </>;
}
