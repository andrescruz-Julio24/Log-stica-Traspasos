'use client';
import { useMemo,useState } from 'react';
import Link from 'next/link';
import { Empty,Hint,Metric,NextStep,Panel,Progress,SearchField,Status,Table,formatDate,stockAvailable,Unavailable } from '../../shared/ui/ModuleKit';

const summation=(xs,field)=>xs.reduce((n,x)=>n+(Number(x[field])||0),0);
function TransferLink({t}){return <Link href="/traspasos" className="text-link">{t.code}</Link>}
function locationRows(data){return data.stocks||[]}

export function ReservationsPage({data}){
  const [q,setQ]=useState('');
  const rows=(data.transfers||[]).flatMap(t=>t.lines.flatMap(line=>line.reservations.map(r=>({
    key:r.id,transfer:t,product:line.product,quantity:r.quantity,active:r.quantity-r.released,orderLineId:r.orderLineId,createdAt:r.createdAt
  })))).filter(r=>(r.transfer.code+' '+r.product.sku+' '+r.transfer.origin.name).toLowerCase().includes(q.toLowerCase()));
  const active=summation(rows,'active');
  return <>
    <div className="stats"><Metric label="Reservas registradas" value={rows.length} detail="Relaciones existentes en PostgreSQL"/><Metric label="Unidades aún reservadas" value={active} detail="Cantidad sin liberar por despacho"/><Metric label="Reservas vinculadas a clientes" value={rows.filter(r=>r.orderLineId).length} detail="Asignaciones asociadas a líneas de pedido"/><Metric label="Ubicaciones con stock" value={new Set(locationRows(data).map(s=>s.locationId)).size} detail="Alcance de la consulta actual"/></div>
    <Hint title="Reserva confirmada ≠ asignación prevista">La reserva física descuenta disponibilidad en el origen. La relación con un pedido de cliente no significa que su mercancía ya haya sido recibida en el destino.</Hint>
    <Panel title="Reservas por traspaso" description="Consulta de unidades comprometidas y cantidad liberada." actions={<NextStep label="Registrar una reserva"/>}>
      <div className="module-toolbar"><SearchField value={q} onChange={setQ}/></div>
      <Table headers={['Folio','Producto','Origen','Reservado','Activo','Pedido cliente','Fecha']} rows={rows.map(r=>({key:r.key,cells:[<TransferLink t={r.transfer}/>,r.product.sku,r.transfer.origin.name,r.quantity,r.active,r.orderLineId?'Vinculado':'Sin vincular',formatDate(r.createdAt)]}))} empty="No se encontraron reservas."/>
    </Panel>
  </>;
}

export function PreparationPage({data}){
  const source=data.transfers.filter(t=>['REQUESTED','PREPARING'].includes(t.status));
  const rows=source.flatMap(t=>t.lines.map(l=>{
    const active=l.reservations.reduce((n,r)=>n+r.quantity-r.released,0);
    return {key:l.id,t,l,active,remaining:Math.max(0,l.requested-l.dispatched)};
  }));
  return <>
    <Hint title="Preparación operativa">Esta vista organiza lo solicitado, reservado y pendiente de despacho. Todavía no existe una confirmación de picking, escaneo de SKU ni evidencia por operario: esas etapas requieren contratos y autorizaciones adicionales.</Hint>
    <Panel title="Cola de preparación" description="Artículos pendientes de separar y despachar." actions={<NextStep label="Gestionar traspasos"/>}>
      <Table headers={['Traspaso','SKU / Producto','Origen','Solicitado','Reservado activo','Por despachar','Estado']} rows={rows.map(r=>({key:r.key,cells:[<TransferLink t={r.t}/>,<><strong>{r.l.product.sku}</strong><small>{r.l.product.name}</small></>,r.t.origin.name,r.l.requested,r.active,r.remaining,<Status value={r.t.status}/>]}))} empty="No hay traspasos pendientes de preparación."/>
    </Panel>
  </>;
}

export function DispatchesPage({data}){
  const rows=data.transfers.flatMap(t=>t.dispatches.map(d=>({key:d.id,t,d,quantity:summation(d.lines,'quantity')}))).sort((a,b)=>new Date(b.d.createdAt)-new Date(a.d.createdAt));
  return <>
    <div className="stats"><Metric label="Despachos registrados" value={rows.length} detail="Salidas físicas confirmadas"/><Metric label="Unidades enviadas" value={rows.reduce((n,x)=>n+x.quantity,0)} detail="Total en el periodo disponible"/><Metric label="Traspasos con despacho" value={new Set(rows.map(x=>x.t.id)).size} detail="Un traspaso admite varias salidas"/><Metric label="Pendientes de completar" value={data.transfers.filter(t=>t.lines.some(l=>l.dispatched<l.requested)).length} detail="Solicitado superior a enviado"/></div>
    <Panel title="Historial de despachos" description="Se registra la salida por despacho, no la solicitud del traspaso." actions={<NextStep label="Realizar despacho"/>}>
      <Table headers={['Identificador','Traspaso','Ruta','Productos','Unidades','Fecha']} rows={rows.map(x=>({key:x.key,cells:[x.key.slice(0,10),<TransferLink t={x.t}/>,x.t.origin.name+' → '+x.t.destination.name,x.d.lines.map(l=>x.t.lines.find(i=>i.productId===l.productId)?.product.sku+' ('+l.quantity+')').join(', '),x.quantity,formatDate(x.d.createdAt)]}))} empty="Todavía no se ha despachado mercancía."/>
    </Panel>
  </>;
}

export function TransitPage({data}){
  const active=data.transfers.filter(t=>['IN_TRANSIT','RECEIVING'].includes(t.status));
  const rows=active.flatMap(t=>t.lines.map(l=>{
    const presented=t.receipts.flatMap(r=>r.lines).filter(r=>r.productId===l.productId).reduce((n,r)=>n+r.presented,0);
    return {key:l.id,t,l,presented,unpresented:Math.max(0,l.dispatched-presented)};
  })).filter(r=>r.l.dispatched>0);
  return <>
    <Hint title="Seguimiento físico aún incompleto" warning>El MVP no registra vehículo, custodio, ubicación GPS ni vincula cada recepción a un despacho específico. La cantidad sin presentar es un saldo agregado por producto y traspaso; no prueba por sí sola dónde se encuentra físicamente la mercancía.</Hint>
    <Panel title="Traspasos con mercancía en movimiento" description="Conciliación agregada entre lo despachado y lo presentado en recepción." actions={<NextStep label="Ver movimientos"/>}>
      <Table headers={['Folio','Origen → Destino','SKU','Despachado','Presentado','Sin presentar','Estado']} rows={rows.map(r=>({key:r.key,cells:[<TransferLink t={r.t}/>,r.t.origin.name+' → '+r.t.destination.name,r.l.product.sku,r.l.dispatched,r.presented,<strong>{r.unpresented}</strong>,<Status value={r.t.status}/>]}))} empty="No hay traspasos con tránsito pendiente según el estado registrado."/>
    </Panel>
  </>;
}

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

export function CancellationsPage({data}){
  const [q,setQ]=useState('');
  const candidates=data.orders.filter(o=>o.status!=='CANCELLED'&&(o.customer+' '+o.code).toLowerCase().includes(q.toLowerCase()));
  return <>
    <Hint title="Cancelaciones: consulta preliminar, sin autorización de ejecución" warning>Actualmente el backend no implementa cancelación, liberación de reservas, redirección de mercancía en tránsito ni movimientos compensatorios. No se mostrará un botón que aparente cancelar realmente un pedido.</Hint>
    <Panel title="Pedidos susceptibles de evaluación" description="Para aprobar una cancelación se debe verificar reservas, despachos, custodia y asignaciones existentes.">
      <div className="module-toolbar"><SearchField value={q} onChange={setQ} placeholder="Buscar pedido o cliente"/></div>
      <Table headers={['Pedido','Cliente','Destino','Abastecimiento','Reservas relacionadas','Evaluación']} rows={candidates.map(o=>{
        const reservations=data.transfers.flatMap(t=>t.lines.flatMap(l=>l.reservations)).filter(r=>o.lines.some(l=>l.id===r.orderLineId));
        return {key:o.id,cells:[o.code,o.customer,o.destination.name,<Progress actual={summation(o.lines,'accepted')} total={summation(o.lines,'required')}/>,reservations.length,<span className="muted">Requiere evaluación y autorización</span>]};})} empty="Sin pedidos para evaluar."/>
    </Panel>
    <Panel title="Flujo de cancelación controlada" description="Diseño de proceso no habilitado en el MVP.">
      <div className="workflow-steps"><span>Solicitud</span><span>Impacto en inventario</span><span>Aprobación</span><span>Compensación</span><span>Auditoría</span></div>
      <Unavailable title="Operación pendiente de backend" description="Se debe construir una transacción de anulación que conserve el historial y evite liberar stock en tránsito." dependency="LOG-07-CANCELACION · BE-09 · QA-VALIDATION"/>
    </Panel>
  </>;
}
