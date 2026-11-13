'use client';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
import { Quantity, Select } from '../../../shared/components/FormFields';

export function CreateOrder({data,busy,act}){
  const [customer,setCustomer]=useState(''),[destinationId,setDestination]=useState(data.locations[0]?.id||''),[productId,setProduct]=useState(data.products[0]?.id||''),[required,setRequired]=useState('10');
  return <form onSubmit={e=>{e.preventDefault();act(()=>submit('/orders',{customer,destinationId,items:[{productId,required:Number(required)}]}))}} className="form-grid"><label className="field full"><span>Cliente</span><input required value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Nombre del cliente"/></label><Select label="Destino" value={destinationId} onChange={setDestination} items={data.locations}/><Select label="Producto" value={productId} onChange={setProduct} items={data.products} caption={p=>p.sku+' — '+p.name}/><Quantity value={required} onChange={setRequired}/><div className="full muted">MVP: una línea por operación; puedes crear más pedidos para otros productos.</div><button disabled={busy} className="primary full">{busy?'Guardando...':'Crear pedido'}</button></form>;
}
