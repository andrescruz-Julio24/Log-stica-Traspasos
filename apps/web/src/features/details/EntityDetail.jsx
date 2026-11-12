'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { api } from '../../shared/api/client';
import { Empty,Hint,Metric,Panel,Progress,Status,Table,formatDate } from '../../shared/ui/ModuleKit';

const total=(arr,key)=>arr.reduce((n,x)=>n+(Number(x[key])||0),0);
function BackLink({href,label}){return <Link href={href} className="secondary">← Volver a {label}</Link>}
function DetailHeader({title,subtitle,href,backLabel}){
  return <header className="detail-page-header"><div><span className="eyebrow">Operaciones / Detalle</span><h1>{title}</h1><p>{subtitle}</p></div><BackLink href={href} label={backLabel}/></header>;
}
export default function EntityDetail({kind,id}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{
    let live=true;
    Promise.all([api('/orders'),api('/transfers'),api('/incidents'),api('/audit')]).then(([orders,transfers,incidents,audit])=>{
      if(live){setData({orders,transfers,incidents,audit});setLoading(false);}
    }).catch(e=>{if(live){setError(e.message);setLoading(false);}});
    return ()=>{live=false;};
  },[]);
  if(loading)return <div className="standalone-loading">Cargando registro desde NestJS...</div>;
  if(error)return <div className="standalone-loading" role="alert">No fue posible consultar los datos: {error} <BackLink href="/" label="inicio"/></div>;
  if(kind==='order'){
    const order=data.orders.find(o=>o.id===id);
    if(!order)return <div className="standalone-loading"><Empty message="Pedido no encontrado."/>{<BackLink href="/pedidos" label="pedidos"/>}</div>;
    const reservations=data.transfers.flatMap(t=>t.lines.flatMap(l=>l.reservations.filter(r=>order.lines.some(ol=>ol.id===r.orderLineId)).map(r=>({t,l,r}))));
    const req=total(order.lines,'required'),accepted=total(order.lines,'accepted');
    return <main className="detail-page">
      <DetailHeader title={order.code} subtitle={order.customer+' · '+order.destination.name+' · '+formatDate(order.createdAt)} href="/pedidos" backLabel="pedidos"/>
      <div className="stats"><Metric label="Unidades requeridas" value={req} detail="Pedido comercial"/><Metric label="Aceptadas y asignadas" value={accepted} detail="Recepción validada"/><Metric label="Pendientes" value={Math.max(0,req-accepted)} detail="Aún no cubiertas"/><Metric label="Estado" value={<Status value={order.status}/>} detail="Calculado desde el registro"/></div>
      <Hint title="Disponibilidad comercial">Este pedido solamente figura listo cuando todas sus líneas alcanzan la cantidad aceptada; la entrega final al cliente y los permisos de liberación no forman parte del MVP.</Hint>
      <Panel title="Productos solicitados" description="Consulta detallada de abastecimiento por SKU.">
        <Table headers={['SKU','Producto','Requerido','Aceptado','Faltante','Progreso']} rows={order.lines.map(l=>({key:l.id,cells:[<strong>{l.product.sku}</strong>,l.product.name,l.required,l.accepted,Math.max(0,l.required-l.accepted),<Progress actual={l.accepted} total={l.required}/>]}))}/>
      </Panel>
      <Panel title="Reservas y traspasos relacionados" description="Una reserva en origen no equivale a recepción en destino.">
        <Table headers={['Traspaso','SKU','Cantidad prevista','Reserva activa','Estado']} rows={reservations.map(({t,l,r})=>({key:r.id,cells:[<Link href={'/traspasos/'+t.id} className="text-link">{t.code}</Link>,l.product.sku,r.quantity,r.quantity-r.released,<Status value={t.status}/>]}))} empty="No hay reservas asociadas a este pedido."/>
      </Panel>
    </main>;
  }
  const t=data.transfers.find(t=>t.id===id);
  if(!t)return <div className="standalone-loading"><Empty message="Traspaso no encontrado."/>{<BackLink href="/traspasos" label="traspasos"/>}</div>;
  const req=total(t.lines,'requested'),dispatched=total(t.lines,'dispatched'),accepted=total(t.lines,'accepted');
  const relatedIncidents=data.incidents.filter(i=>i.transferId===t.id);
  const history=data.audit.filter(e=>e.entityId===t.id||e.data?.transferId===t.id);
  return <main className="detail-page">
    <DetailHeader title={t.code} subtitle={t.origin.name+' → '+t.destination.name+' · '+formatDate(t.createdAt)} href="/traspasos" backLabel="traspasos"/>
    <div className="stats"><Metric label="Solicitado" value={req} detail="Solicitud original"/><Metric label="Despachado" value={dispatched} detail="Salidas físicas"/><Metric label="Aceptado" value={accepted} detail="Recepciones verificadas"/><Metric label="Pendiente" value={Math.max(0,req-accepted)} detail="Contra cantidad solicitada"/></div>
    <Hint title="Cierre registrado no implica cumplimiento autorizado" warning>El estado de cierre actual es una aproximación del MVP; no representa aprobación de diferencias ni conciliación formal de incidencias.</Hint>
    <div className="two-cols">
      <Panel title="Información general" description="Resumen del traspaso."><div className="detail-fields">
        <div><span>Estado</span><Status value={t.status}/></div><div><span>Origen</span><strong>{t.origin.name}</strong></div><div><span>Destino</span><strong>{t.destination.name}</strong></div><div><span>Incidencias vinculadas</span><strong>{relatedIncidents.length}</strong></div>
      </div></Panel>
      <Panel title="Progreso del movimiento" description="Solicitado → enviado → aceptado."><div className="detail-progress">
        <div><span>Despachado</span><Progress actual={dispatched} total={req}/></div><div><span>Aceptado</span><Progress actual={accepted} total={req}/></div>
      </div></Panel>
    </div>
    <Panel title="Líneas de mercancía" description="Cantidades registradas por producto.">
      <Table headers={['SKU','Producto','Requerido','Despachado','Aceptado','Reservado activo']} rows={t.lines.map(l=>({key:l.id,cells:[l.product.sku,l.product.name,l.requested,l.dispatched,l.accepted,l.reservations.reduce((n,r)=>n+r.quantity-r.released,0)]}))}/>
    </Panel>
    <div className="two-cols">
      <Panel title="Despachos" description="Salidas individuales del origen.">
        <Table headers={['Registro','Unidades','Fecha']} rows={t.dispatches.map(d=>({key:d.id,cells:[d.id.slice(0,10),total(d.lines,'quantity'),formatDate(d.createdAt)]}))} empty="Sin despachos registrados."/>
      </Panel>
      <Panel title="Recepciones" description="Aceptado y rechazado por evento.">
        <Table headers={['Registro','Presentado','Aceptado','Rechazado']} rows={t.receipts.map(r=>({key:r.id,cells:[r.id.slice(0,10),total(r.lines,'presented'),total(r.lines,'accepted'),total(r.lines,'rejected')]}))} empty="Sin recepciones."/>
      </Panel>
    </div>
    <Panel title="Incidencias" description="Problemas asociados al traspaso.">
      <Table headers={['Tipo','Observación','Estado','Creada']} rows={relatedIncidents.map(i=>({key:i.id,cells:[i.type,i.notes,<Status value={i.status}/>,formatDate(i.createdAt)]}))} empty="No hay incidencias relacionadas."/>
    </Panel>
    <Panel title="Historial disponible" description="Eventos almacenados en la ventana de auditoría consultada (últimos 200).">
      <Table headers={['Evento','Actor demo','Fecha','Entidad']} rows={history.map(e=>({key:e.id,cells:[e.type,e.actor,formatDate(e.createdAt),e.entity+' / '+e.entityId.slice(0,10)]}))} empty="No hay eventos relacionados dentro de los registros consultados."/>
    </Panel>
  </main>;
}
