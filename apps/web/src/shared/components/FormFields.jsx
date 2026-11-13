'use client';
export function Quantity({value,onChange,label='Cantidad'}){return <label className="field"><span>{label}</span><input type="number" min="1" step="1" value={value} onChange={e=>onChange(e.target.value)}/></label>}
export function Select({label,value,onChange,items,caption=(i)=>i.name}){return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)} required>{items.map(i=><option key={i.id} value={i.id}>{caption(i)}</option>)}</select></label>}
