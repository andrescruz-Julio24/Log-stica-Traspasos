'use client';
import { useMemo,useState } from 'react';
import Link from 'next/link';
import { Empty,Hint,Metric,Panel,Progress,SearchField,Status,Table,formatDate,percentage } from '../../shared/ui/ModuleKit';
const sum=(arr,k)=>arr.reduce((a,x)=>a+(Number(x[k])||0),0);
export function ClientsPage({data}){
  const [q,setQ]=useState('');
  const grouped=Object.values(data.orders.reduce((acc,o)=>{
    const k=o.customer.trim().toLocaleLowerCase('es-MX');
    if(!acc[k])acc[k]={name:o.customer,orders:[],required:0,accepted:0};
    acc[k].orders.push(o);acc[k].required+=sum(o.lines,'required');acc[k].accepted+=sum(o.lines,'accepted');
    return acc;
  },{})).filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));
  return <>
    <Hint title="Clientes derivados de pedidos">Esta lista agrupa por nombre escrito en los pedidos; aún no existe catálogo de clientes con identificador empresarial. Dos nombres distintos pueden referirse a la misma persona o empresa.</Hint>
    <Panel title="Clientes con pedidos registrados" description="Vista de abastecimiento comercial por cliente." actions={<Link href="/pedidos" className="secondary">Ir a pedidos</Link>}>
      <div className="module-toolbar"><SearchField value={q} onChange={setQ} placeholder="Buscar cliente"/></div>
      <Table headers={['Cliente','Pedidos','Pedidos listos','Abastecimiento','Unidades faltantes']} rows={grouped.map(c=>({key:c.name,cells:[<strong>{c.name}</strong>,c.orders.length,c.orders.filter(o=>o.status==='READY').length,<Progress actual={c.accepted} total={c.required}/>,Math.max(0,c.required-c.accepted)]}))} empty="No hay clientes que coincidan."/>
    </Panel>
  </>;
}
function SimpleBar({label,value,total}){return <div className="report-bar"><div><strong>{label}</strong><span>{value}</span></div><div className="progress-track"><div style={{width:percentage(value,total)+'%'}}/></div></div>;}
export function ReportsPage({data}){
  const orders=data.orders;
  const transfers=data.transfers;
  const requested=transfers.reduce((a,t)=>a+sum(t.lines,'requested'),0);
  const dispatched=transfers.reduce((a,t)=>a+sum(t.lines,'dispatched'),0);
  const accepted=transfers.reduce((a,t)=>a+sum(t.lines,'accepted'),0);
  const statuses=['PENDING','PARTIAL','READY','CANCELLED'];
  const totalOrders=orders.length;
  return <>
    <Hint title="Reporte descriptivo del estado actual">No se calculan SLA, puntualidad, tiempo promedio de preparación ni desempeño por usuario porque faltan eventos detallados y fechas de compromiso. Los conteos corresponden a los registros actualmente consultables, no a un histórico consolidado de períodos.</Hint>
    <div className="stats"><Metric label="Pedidos registrados" value={totalOrders} detail="Sin filtro temporal"/><Metric label="Pedidos listos" value={orders.filter(o=>o.status==='READY').length} detail="Según recepción aceptada en el MVP"/><Metric label="Unidades despachadas" value={dispatched} detail={'De '+requested+' solicitadas'}/><Metric label="Unidades aceptadas" value={accepted} detail={'De '+dispatched+' despachadas'}/></div>
    <div className="two-cols">
      <Panel title="Abastecimiento de clientes" description="Conteos por estado de pedido.">
        <div className="report-bars">{statuses.map(s=><SimpleBar key={s} label={{PENDING:'Pendientes',PARTIAL:'Parciales',READY:'Listos',CANCELLED:'Cancelados'}[s]} value={orders.filter(o=>o.status===s).length} total={Math.max(1,totalOrders)}/>)}</div>
      </Panel>
      <Panel title="Volúmenes del flujo logístico" description="Solicitado, enviado y aceptado no representan lo mismo.">
        <div className="report-bars">{[['Solicitado',requested],['Despachado',dispatched],['Aceptado',accepted]].map(([label,value])=><SimpleBar key={label} label={label} value={value} total={Math.max(1,requested)}/>)}</div>
      </Panel>
    </div>
    <Panel title="Detalle de resultados por traspaso" description="El cierre registrado no certifica cumplimiento total.">
      <Table headers={['Traspaso','Ruta','Solicitado','Despachado','Aceptado','Diferencia contra solicitud','Estado']} rows={transfers.map(t=>{
        const req=sum(t.lines,'requested'),dis=sum(t.lines,'dispatched'),acc=sum(t.lines,'accepted');
        return {key:t.id,cells:[<Link href={"/traspasos/"+t.id} className="text-link">{t.code}</Link>,t.origin.name+' → '+t.destination.name,req,dis,acc,Math.max(0,req-acc),<Status value={t.status}/>]};
      })} empty="No hay traspasos para generar el reporte."/>
    </Panel>
  </>;
}
export function SearchPage({data}){
  const [q,setQ]=useState('');
  const normalized=q.toLocaleLowerCase('es-MX').trim();
  const entries=[
    ...data.orders.map(x=>({key:'order:'+x.id,type:'Pedido',title:x.code,detail:x.customer+' · '+x.destination.name,href:'/pedidos'})),
    ...data.transfers.map(x=>({key:'transfer:'+x.id,type:'Traspaso',title:x.code,detail:x.origin.name+' → '+x.destination.name,href:'/traspasos'})),
    ...data.products.map(x=>({key:'product:'+x.id,type:'Producto',title:x.sku,detail:x.name,href:'/inventario'})),
    ...data.incidents.map(x=>({key:'incident:'+x.id,type:'Incidencia',title:x.type,detail:x.notes,href:'/incidencias'})),
  ].filter(x=>normalized&&(x.title+' '+x.detail+' '+x.type).toLocaleLowerCase('es-MX').includes(normalized)).slice(0,100);
  return <Panel title="Búsqueda global" description="Busca por SKU, folio, cliente o descripción. Los resultados se limitan a los registros disponibles en la API.">
    <div className="module-toolbar"><SearchField value={q} onChange={setQ} placeholder="Escribe un SKU, cliente, folio o incidencia"/></div>
    {normalized?<Table headers={['Tipo','Identificador','Referencia','Acción']} rows={entries.map(x=>({key:x.key,cells:[x.type,<strong>{x.title}</strong>,x.detail,<Link href={x.href} className="text-link">Consultar</Link>]}))} empty="Sin coincidencias para la búsqueda."/>:<Empty message="Introduce al menos un término para buscar en los registros del SGTL."/>}
  </Panel>;
}
