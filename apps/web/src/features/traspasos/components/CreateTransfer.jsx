'use client';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
import { Quantity, Select } from '../../../shared/components/FormFields';

export function CreateTransfer({data,busy,act}){
  const [originId,setOrigin]=useState(data.locations[0]?.id||''),[destinationId,setDestination]=useState(data.locations[1]?.id||''),[productId,setProduct]=useState(data.products[0]?.id||''),[requested,setRequested]=useState('20');
  return <form onSubmit={e=>{e.preventDefault();act(()=>submit('/transfers',{originId,destinationId,items:[{productId,requested:Number(requested)}]}))}} className="form-grid"><Select label="Origen" value={originId} onChange={setOrigin} items={data.locations}/><Select label="Destino" value={destinationId} onChange={setDestination} items={data.locations}/><Select label="Producto" value={productId} onChange={setProduct} items={data.products} caption={p=>p.sku+' — '+p.name}/><Quantity value={requested} onChange={setRequested}/><p className="muted full">Crear el traspaso no mueve inventario. La reserva se realiza por separado.</p><button disabled={busy} className="primary full">{busy?'Guardando...':'Crear traspaso'}</button></form>;
}
