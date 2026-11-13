'use client';
import { Panel, Empty, formatDate as fmt } from '../../../shared/ui/ModuleKit';
export default function AuditoriaPage({data}){
  return (<Panel title="Bitácora de auditoría" subtitle="Eventos históricos inmutables registrados por el servidor"><div className="timeline">{data.audit.map(a=><div className="audit-event" key={a.id}><span className="timeline-dot"/><div><strong>{a.type}</strong><p>{a.entity} · {a.entityId}</p><small>{a.actor} · {fmt(a.createdAt)}</small><details><summary>Datos del evento</summary><pre>{JSON.stringify(a.data,null,2)}</pre></details></div></div>)}{!data.audit.length&&<Empty>Sin eventos todavía.</Empty>}</div></Panel>);
}
