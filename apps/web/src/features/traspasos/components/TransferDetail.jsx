'use client';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
import { Quantity, Select } from '../../../shared/components/FormFields';

export function TransferDetail({transfer,orders,busy,onAction}){
  const [productId,setProduct]=useState(transfer.lines[0]?.productId||''),[quantity,setQuantity]=useState('1'),[orderLineId,setOrderLine]=useState(''),[presented,setPresented]=useState('1'),[accepted,setAccepted]=useState('1');
  const line=transfer.lines.find(l=>l.productId===productId);
  const candidates=orders.filter(o=>o.destinationId===transfer.destinationId&&o.status!=='CANCELLED').flatMap(o=>o.lines.filter(l=>l.productId===productId).map(l=>({id:l.id,name:o.code+' · '+o.customer+' ('+(l.required-l.accepted)+' faltantes)'})));
  const qty=Number(quantity),a=Number(accepted),p=Number(presented);
  return <><div className="detail"><h3>Operar {transfer.code}</h3><p className="muted">Origen: {transfer.origin.name} · Destino: {transfer.destination.name}</p><div className="form-grid"><Select label="Producto" value={productId} onChange={x=>{setProduct(x);setOrderLine('')}} items={transfer.lines.map(l=>({id:l.productId,name:l.product.sku+' · '+l.product.name}))}/><Quantity value={quantity} onChange={setQuantity}/>
    <label className="field full"><span>Asignación prevista a cliente (opcional, antes de reservar)</span><select value={orderLineId} onChange={e=>setOrderLine(e.target.value)}><option value="">Sin pedido asociado</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="actions full"><button disabled={busy||!line} className="primary" onClick={()=>onAction(()=>submit('/transfers/'+transfer.id+'/reservations',{transferLineId:line.id,quantity:qty,...(orderLineId?{orderLineId}:{})}))}>1. Reservar</button><button disabled={busy||!line} className="secondary" onClick={()=>onAction(()=>submit('/transfers/'+transfer.id+'/dispatches',{items:[{productId,quantity:qty}]},{headers:{'Idempotency-Key':crypto.randomUUID()}}))}>2. Despachar</button></div>
    <Quantity label="Presentado en recepción" value={presented} onChange={setPresented}/><Quantity label="Aceptado (no incluye rechazados)" value={accepted} onChange={setAccepted}/>
    <button className="primary full" disabled={busy||!line||a>p||a<0} onClick={()=>onAction(()=>submit('/transfers/'+transfer.id+'/receipts',{items:[{productId,presented:p,accepted:a,rejected:p-a}]},{headers:{'Idempotency-Key':crypto.randomUUID()}}))}>3. Registrar recepción verificada</button>
  </div></div><div className="line-summary">{transfer.lines.map(l=><div key={l.id}><strong>{l.product.sku}</strong> · Solicitado {l.requested} · Despachado {l.dispatched} · Aceptado {l.accepted} · Reservas {l.reservations.reduce((n,r)=>n+r.quantity-r.released,0)}</div>)}</div></>;
}
