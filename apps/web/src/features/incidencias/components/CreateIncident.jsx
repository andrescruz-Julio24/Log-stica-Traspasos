'use client';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
import { Quantity, Select } from '../../../shared/components/FormFields';

export function CreateIncident({data,busy,act}){
  const [type,setType]=useState('FALTANTE'),[notes,setNotes]=useState(''),[transferId,setTransfer]=useState('');
  return <form className="form-grid" onSubmit={e=>{e.preventDefault();act(()=>submit('/incidents',{type,notes,...(transferId?{transferId}:{})}))}}><label className="field"><span>Tipo</span><select value={type} onChange={e=>setType(e.target.value)}>{['FALTANTE','EXCEDENTE','PRODUCTO_INCORRECTO','RETRASO','OTRO'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>Traspaso (opcional)</span><select value={transferId} onChange={e=>setTransfer(e.target.value)}><option value="">General</option>{data.transfers.map(t=><option key={t.id} value={t.id}>{t.code}</option>)}</select></label><label className="field full"><span>Descripción</span><textarea required value={notes} onChange={e=>setNotes(e.target.value)}/></label><button disabled={busy} className="primary full">Registrar incidencia</button></form>;
}
