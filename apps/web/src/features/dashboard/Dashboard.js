'use client';
import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeftRight, Boxes, ClipboardCheck, ClipboardList, LayoutDashboard, Package, Plus, RefreshCw, Truck, History } from 'lucide-react';
import { api,submit } from '../../shared/api/client';

const sections=[
  ['dashboard','Resumen',LayoutDashboard],['orders','Pedidos de clientes',ClipboardList],
  ['transfers','Traspasos',ArrowLeftRight],['stock','Inventario',Boxes],
  ['incidents','Incidencias',AlertTriangle],['audit','Auditoría',History],
];
const fmt=(x)=>new Date(x).toLocaleString('es-MX');
function Pill({status}) {
  const label=({PENDING:'Pendiente',PARTIAL:'Parcial',READY:'Listo',REQUESTED:'Solicitado',PREPARING:'Preparando',IN_TRANSIT:'En tránsito',RECEIVING:'En recepción',CLOSED:'Cerrado',OPEN:'Abierta',RESOLVED:'Resuelta'})[status]||status;
  const tone=status==='READY'||status==='CLOSED'?'good':status==='OPEN'||status==='PARTIAL'?'warn':'neutral';
  return <span className={'pill '+tone}>{label}</span>;
}
function Panel({title,subtitle,children,action}){
  return <section className="panel"><div className="panel-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function Empty({children}){return <div className="empty">{children}</div>}
function Modal({title,onClose,children}){return <div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="ghost" onClick={onClose}>Cerrar ×</button></div>{children}</div></div>}
function Quantity({value,onChange,label='Cantidad'}){return <label className="field"><span>{label}</span><input type="number" min="1" step="1" value={value} onChange={e=>onChange(e.target.value)}/></label>}
export default function Dashboard(){
  const [section,setSection]=useState('dashboard');
  const [data,setData]=useState({products:[],locations:[],stocks:[],orders:[],transfers:[],incidents:[],audit:[]});
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [modal,setModal]=useState(null),[selected,setSelected]=useState(null);
  async function reload(){
    try{
      setError('');
      const [bootstrap,orders,transfers,incidents,audit]=await Promise.all([api('/bootstrap'),api('/orders'),api('/transfers'),api('/incidents'),api('/audit')]);
      setData({...bootstrap,orders,transfers,incidents,audit});
    }catch(e){setError(e.message)}finally{setLoading(false)}
  }
  useEffect(()=>{reload()},[]);
  async function act(task){
    setBusy(true);setError('');setNotice('');
    try{await task();await reload();setModal(null);setNotice('Operación confirmada por el servidor.')}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const ready=data.orders.filter(o=>o.status==='READY').length,partial=data.orders.filter(o=>o.status==='PARTIAL').length,active=data.transfers.filter(t=>t.status!=='CLOSED'&&t.status!=='CANCELLED').length;
  const location=(id)=>data.locations.find(x=>x.id===id)?.name||'—';
  const title=sections.find(x=>x[0]===section)?.[1];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Package size={22}/></div><div><strong>SGTL</strong><small>Gestión logística</small></div></div>
      <p className="menu-label">OPERACIÓN</p>
      <nav aria-label="Navegación principal">{sections.map(([key,label,Icon])=><button key={key} className={'nav-btn '+(section===key?'active':'')} onClick={()=>{setSection(key);setSelected(null)}}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-bottom"><span className="online-dot"/> Entorno de demostración <small>Sin autenticación empresarial</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">Operaciones / {title}</span><h1>{title}</h1></div><div className="top-actions"><span className="tag">MVP · Desarrollo local</span><button className="secondary" onClick={reload}><RefreshCw size={16}/> Actualizar</button></div></header>
      {error&&<div className="message error" role="alert"><AlertTriangle size={18}/> {error}<button className="ghost" onClick={()=>setError('')}>×</button></div>}
      {notice&&<div className="message success" role="status"><ClipboardCheck size={18}/> {notice}<button className="ghost" onClick={()=>setNotice('')}>×</button></div>}
      {loading?<div className="loading">Cargando datos de operación...</div>:<>
      {section==='dashboard'&&<>
        <div className="stats">
          {[['Pedidos listos',ready,'Confirmados para preparación'],['Abastecimiento parcial',partial,'Requieren mercancía'],['Traspasos activos',active,'En gestión o movimiento'],['Incidencias abiertas',data.incidents.filter(i=>i.status==='OPEN').length,'Necesitan revisión']].map(([label,num,caption])=><div className="stat" key={label}><small>{label}</small><strong>{num}</strong><span>{caption}</span></div>)}
        </div>
        <div className="two-cols">
          <Panel title="Traspasos recientes" subtitle="Estado del movimiento y mercancía"><div className="stack">{data.transfers.slice(0,6).map(t=><button className="list-row" onClick={()=>{setSection('transfers');setSelected(t.id)}} key={t.id}><div><strong>{t.code}</strong><small>{t.origin.name} → {t.destination.name}</small></div><Pill status={t.status}/></button>)}{!data.transfers.length&&<Empty>Aún no hay traspasos.</Empty>}</div></Panel>
          <Panel title="Pedidos por preparar" subtitle="Disponibilidad confirmada por cliente"><div className="stack">{data.orders.slice(0,6).map(o=><button className="list-row" onClick={()=>setSection('orders')} key={o.id}><div><strong>{o.code} · {o.customer}</strong><small>{o.lines.reduce((n,l)=>n+l.accepted,0)} / {o.lines.reduce((n,l)=>n+l.required,0)} unidades aceptadas</small></div><Pill status={o.status}/></button>)}{!data.orders.length&&<Empty>Sin pedidos registrados.</Empty>}</div></Panel>
        </div>
      </>}
      {section==='orders'&&<Panel title="Pedidos de clientes" subtitle="Listos únicamente cuando todas las líneas cumplen la cantidad aceptada" action={<button className="primary" onClick={()=>setModal('new-order')}><Plus size={16}/> Nuevo pedido</button>}>
        <div className="table-scroll"><table><thead><tr><th>Folio</th><th>Cliente</th><th>Destino</th><th>Productos</th><th>Progreso</th><th>Estado</th></tr></thead><tbody>{data.orders.map(o=><tr key={o.id}><td><strong>{o.code}</strong><small>{fmt(o.createdAt)}</small></td><td>{o.customer}</td><td>{o.destination.name}</td><td>{o.lines.map(l=><div key={l.id} className="subline">{l.product.sku}: {l.required} u.</div>)}</td><td>{o.lines.reduce((a,l)=>a+l.accepted,0)} / {o.lines.reduce((a,l)=>a+l.required,0)}</td><td><Pill status={o.status}/></td></tr>)}</tbody></table>{!data.orders.length&&<Empty>No hay pedidos. Registra el primero.</Empty>}</div>
      </Panel>}
      {section==='stock'&&<Panel title="Inventario por ubicación" subtitle="Existencia física ≠ disponible para nuevas reservas"><div className="table-scroll"><table><thead><tr><th>SKU</th><th>Producto</th><th>Ubicación</th><th>Físico</th><th>Reservado</th><th>Bloqueado</th><th>Disponible</th></tr></thead><tbody>{data.stocks.map(s=><tr key={s.id}><td><strong>{s.product.sku}</strong></td><td>{s.product.name}</td><td>{s.location.name}</td><td>{s.physical}</td><td>{s.reserved}</td><td>{s.blocked}</td><td><strong className="positive">{s.physical-s.reserved-s.blocked}</strong></td></tr>)}</tbody></table>{!data.stocks.length&&<Empty>Sin registros de inventario.</Empty>}</div></Panel>}
      {section==='transfers'&&<Panel title="Traspasos" subtitle="Reserva, despacho y recepción son operaciones distintas" action={<button className="primary" onClick={()=>setModal('new-transfer')}><Plus size={16}/> Nuevo traspaso</button>}>
        <div className="table-scroll"><table><thead><tr><th>Folio</th><th>Ruta</th><th>Solicitado</th><th>Despachado</th><th>Aceptado</th><th>Estado</th><th></th></tr></thead><tbody>{data.transfers.map(t=><tr key={t.id}><td><strong>{t.code}</strong><small>{fmt(t.createdAt)}</small></td><td>{t.origin.name}<br/><span className="muted">→ {t.destination.name}</span></td><td>{t.lines.reduce((n,l)=>n+l.requested,0)}</td><td>{t.lines.reduce((n,l)=>n+l.dispatched,0)}</td><td>{t.lines.reduce((n,l)=>n+l.accepted,0)}</td><td><Pill status={t.status}/></td><td><button className="secondary" onClick={()=>setSelected(selected===t.id?null:t.id)}>{selected===t.id?'Ocultar':'Gestionar'}</button></td></tr>)}</tbody></table>{!data.transfers.length&&<Empty>Crea un traspaso para comenzar.</Empty>}</div>
        {selected&&data.transfers.some(t=>t.id===selected)&&<TransferDetail transfer={data.transfers.find(t=>t.id===selected)} orders={data.orders} busy={busy} onAction={act}/>}
      </Panel>}
      {section==='incidents'&&<Panel title="Incidencias" subtitle="Diferencias y observaciones que requieren seguimiento" action={<button className="primary" onClick={()=>setModal('new-incident')}><Plus size={16}/> Registrar incidencia</button>}>
        <div className="table-scroll"><table><thead><tr><th>Tipo</th><th>Observación</th><th>Traspaso</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{data.incidents.map(i=><tr key={i.id}><td><strong>{i.type}</strong></td><td>{i.notes}</td><td>{data.transfers.find(t=>t.id===i.transferId)?.code||'General'}</td><td>{fmt(i.createdAt)}</td><td><Pill status={i.status}/></td></tr>)}</tbody></table>{!data.incidents.length&&<Empty>No hay incidencias.</Empty>}</div></Panel>}
      {section==='audit'&&<Panel title="Bitácora de auditoría" subtitle="Eventos históricos inmutables registrados por el servidor"><div className="timeline">{data.audit.map(a=><div className="audit-event" key={a.id}><span className="timeline-dot"/><div><strong>{a.type}</strong><p>{a.entity} · {a.entityId}</p><small>{a.actor} · {fmt(a.createdAt)}</small><details><summary>Datos del evento</summary><pre>{JSON.stringify(a.data,null,2)}</pre></details></div></div>)}{!data.audit.length&&<Empty>Sin eventos todavía.</Empty>}</div></Panel>}
      </>}
    </main>
    {modal&&<Modal title={{'new-order':'Nuevo pedido de cliente','new-transfer':'Nuevo traspaso','new-incident':'Registrar incidencia'}[modal]} onClose={()=>setModal(null)}>{modal==='new-order'?<CreateOrder data={data} busy={busy} act={act}/>:modal==='new-transfer'?<CreateTransfer data={data} busy={busy} act={act}/>:<CreateIncident data={data} busy={busy} act={act}/>}</Modal>}
  </div>;
}
function CreateOrder({data,busy,act}){
  const [customer,setCustomer]=useState(''),[destinationId,setDestination]=useState(data.locations[0]?.id||''),[productId,setProduct]=useState(data.products[0]?.id||''),[required,setRequired]=useState('10');
  return <form onSubmit={e=>{e.preventDefault();act(()=>submit('/orders',{customer,destinationId,items:[{productId,required:Number(required)}]}))}} className="form-grid"><label className="field full"><span>Cliente</span><input required value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Nombre del cliente"/></label><Select label="Destino" value={destinationId} onChange={setDestination} items={data.locations}/><Select label="Producto" value={productId} onChange={setProduct} items={data.products} caption={p=>p.sku+' — '+p.name}/><Quantity value={required} onChange={setRequired}/><div className="full muted">MVP: una línea por operación; puedes crear más pedidos para otros productos.</div><button disabled={busy} className="primary full">{busy?'Guardando...':'Crear pedido'}</button></form>;
}
function CreateTransfer({data,busy,act}){
  const [originId,setOrigin]=useState(data.locations[0]?.id||''),[destinationId,setDestination]=useState(data.locations[1]?.id||''),[productId,setProduct]=useState(data.products[0]?.id||''),[requested,setRequested]=useState('20');
  return <form onSubmit={e=>{e.preventDefault();act(()=>submit('/transfers',{originId,destinationId,items:[{productId,requested:Number(requested)}]}))}} className="form-grid"><Select label="Origen" value={originId} onChange={setOrigin} items={data.locations}/><Select label="Destino" value={destinationId} onChange={setDestination} items={data.locations}/><Select label="Producto" value={productId} onChange={setProduct} items={data.products} caption={p=>p.sku+' — '+p.name}/><Quantity value={requested} onChange={setRequested}/><p className="muted full">Crear el traspaso no mueve inventario. La reserva se realiza por separado.</p><button disabled={busy} className="primary full">{busy?'Guardando...':'Crear traspaso'}</button></form>;
}
function CreateIncident({data,busy,act}){
  const [type,setType]=useState('FALTANTE'),[notes,setNotes]=useState(''),[transferId,setTransfer]=useState('');
  return <form className="form-grid" onSubmit={e=>{e.preventDefault();act(()=>submit('/incidents',{type,notes,...(transferId?{transferId}:{})}))}}><label className="field"><span>Tipo</span><select value={type} onChange={e=>setType(e.target.value)}>{['FALTANTE','EXCEDENTE','PRODUCTO_INCORRECTO','RETRASO','OTRO'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>Traspaso (opcional)</span><select value={transferId} onChange={e=>setTransfer(e.target.value)}><option value="">General</option>{data.transfers.map(t=><option key={t.id} value={t.id}>{t.code}</option>)}</select></label><label className="field full"><span>Descripción</span><textarea required value={notes} onChange={e=>setNotes(e.target.value)}/></label><button disabled={busy} className="primary full">Registrar incidencia</button></form>;
}
function Select({label,value,onChange,items,caption=(i)=>i.name}){return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)} required>{items.map(i=><option key={i.id} value={i.id}>{caption(i)}</option>)}</select></label>}
function TransferDetail({transfer,orders,busy,onAction}){
  const [productId,setProduct]=useState(transfer.lines[0]?.productId||''),[quantity,setQuantity]=useState('1'),[orderLineId,setOrderLine]=useState(''),[presented,setPresented]=useState('1'),[accepted,setAccepted]=useState('1');
  const line=transfer.lines.find(l=>l.productId===productId);
  const candidates=orders.filter(o=>o.destinationId===transfer.destinationId&&o.status!=='CANCELLED').flatMap(o=>o.lines.filter(l=>l.productId===productId).map(l=>({id:l.id,name:o.code+' · '+o.customer+' ('+(l.required-l.accepted)+' faltantes)'})));
  const qty=Number(quantity),a=Number(accepted),p=Number(presented);
  return <><div className="detail"><h3>Operar {transfer.code}</h3><p className="muted">Origen: {transfer.origin.name} · Destino: {transfer.destination.name}</p><div className="form-grid"><Select label="Producto" value={productId} onChange={x=>{setProduct(x);setOrderLine('')}} items={transfer.lines.map(l=>({id:l.productId,name:l.product.sku+' · '+l.product.name}))}/><Quantity value={quantity} onChange={setQuantity}/>
    <label className="field full"><span>Asignación prevista a cliente (opcional, antes de reservar)</span><select value={orderLineId} onChange={e=>setOrderLine(e.target.value)}><option value="">Sin pedido asociado</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="actions full"><button disabled={busy||!line} className="primary" onClick={()=>onAction(()=>submit('/transfers/'+transfer.id+'/reservations',{transferLineId:line.id,quantity:qty,...(orderLineId?{orderLineId}:{})}))}>1. Reservar</button><button disabled={busy||!line} className="secondary" onClick={()=>onAction(()=>submit('/transfers/'+transfer.id+'/dispatches',{items:[{productId,quantity:qty}]},{headers:{'Idempotency-Key':crypto.randomUUID()}}))}>2. Despachar</button></div>
    <Quantity label="Presentado en recepción" value={presented} onChange={setPresented}/><Quantity label="Aceptado (no incluye rechazados)" value={accepted} onChange={setAccepted}/>
    <button className="primary full" disabled={busy||!line||a>p||a<0} onClick={()=>onAction(()=>submit('/transfers/'+transfer.id+'/receipts',{items:[{productId,presented:p,accepted:a,rejected:p-a}]},{headers:{'Idempotency-Key':crypto.randomUUID()}}))}>3. Registrar recepción verificada</button>
  </div><div className="line-summary">{transfer.lines.map(l=><div key={l.id}><strong>{l.product.sku}</strong> · Solicitado {l.requested} · Despachado {l.dispatched} · Aceptado {l.accepted} · Reservas {l.reservations.reduce((n,r)=>n+r.quantity-r.released,0)}</div>)}</div></>;
}
