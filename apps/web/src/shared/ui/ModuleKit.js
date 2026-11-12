'use client';
import Link from 'next/link';

const stateLabels={
  PENDING:'Pendiente', PARTIAL:'Parcial', READY:'Listo para preparar',
  CANCELLED:'Cancelado', REQUESTED:'Solicitado', PREPARING:'En preparación',
  DISPATCHED:'Despachado', IN_TRANSIT:'En tránsito', RECEIVING:'En recepción',
  CLOSED:'Cerrado (demo)', OPEN:'Abierta', RESOLVED:'Resuelta'
};
export function Status({value}){
  const label=stateLabels[value]||value||'Sin estado';
  const tone=['READY','RESOLVED'].includes(value)?'good':['OPEN','PARTIAL','RECEIVING'].includes(value)?'warn':'neutral';
  return <span className={'pill '+tone}>{label}</span>;
}
export function Panel({title,description,actions,children}){
  return <section className="panel">
    <div className="panel-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{actions&&<div className="module-actions">{actions}</div>}</div>
    {children}
  </section>;
}
export function Empty({message='No hay registros para esta vista.'}){
  return <div className="empty" role="status">{message}</div>;
}
export function Hint({title,children,warning=false}){
  return <div className={'module-hint '+(warning?'is-warning':'')} role="note">
    <strong>{title}</strong><div>{children}</div>
  </div>;
}
export function Metric({label,value,detail}){
  return <div className="stat"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
}
export function Table({headers,rows,empty='No hay registros.'}){
  return <div className="table-scroll"><table><thead><tr>{headers.map((h,i)=><th scope="col" key={i}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row,i)=><tr key={row.key||i}>{row.cells.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table>
    {!rows.length&&<Empty message={empty}/>}
  </div>;
}
export function NextStep({href='/traspasos',label='Ir a traspasos'}){
  return <Link href={href} className="secondary">{label}</Link>;
}
export function formatDate(value){
  if(!value)return '—';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'});
}
export function stockAvailable(s){return Math.max(0,s.physical-s.reserved-s.blocked);}
export function percentage(actual,total){return total>0?Math.min(100,Math.round(actual/total*100)):0;}
export function Progress({actual,total}){
  const pct=percentage(actual,total);
  return <div className="progress" aria-label={actual+' de '+total+' unidades'}><div className="progress-track"><div style={{width:pct+'%'}}/></div><span>{actual} / {total} ({pct}%)</span></div>;
}
export function SearchField({value,onChange,placeholder='Buscar por folio, SKU o descripción'}){
  return <label className="search-field"><span className="sr-only">Buscar registros</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type="search"/></label>;
}
export function Unavailable({title,description,dependency}){
  return <div className="unavailable"><div className="unavailable-mark">!</div><strong>{title}</strong><p>{description}</p>{dependency&&<small>Dependencia: {dependency}</small>}</div>;
}
