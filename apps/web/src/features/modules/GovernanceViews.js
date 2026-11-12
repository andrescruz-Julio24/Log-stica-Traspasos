'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Empty,Hint,Metric,Panel,SearchField,Status,Table,Unavailable,formatDate,stockAvailable } from '../../shared/ui/ModuleKit';
const total=(items,field)=>items.reduce((n,item)=>n+(Number(item[field])||0),0);

export function AlertsPage({data}){
  const [q,setQ]=useState('');
  const alerts=[
    ...data.incidents.filter(i=>i.status==='OPEN').map(i=>({key:'incident:'+i.id,kind:'Incidencia abierta',title:i.type,detail:i.notes,level:'Crítica',when:i.createdAt,href:'/incidencias'})),
    ...data.transfers.filter(t=>t.status==='RECEIVING').map(t=>({key:'receiving:'+t.id,kind:'Recepción por conciliar',title:t.code,detail:t.origin.name+' → '+t.destination.name,level:'Revisión',when:t.createdAt,href:'/recepciones'})),
    ...data.orders.filter(o=>o.status==='PARTIAL').map(o=>({key:'order:'+o.id,kind:'Abastecimiento parcial',title:o.code+' · '+o.customer,detail:'Faltantes: '+o.lines.reduce((n,l)=>n+Math.max(0,l.required-l.accepted),0)+' unidades',level:'Pendiente',when:o.createdAt,href:'/pedidos'})),
  ].filter(a=>(a.kind+' '+a.title+' '+a.detail).toLowerCase().includes(q.toLowerCase()));
  return <>
    <Hint title="Alertas derivadas, no notificaciones persistidas">Esta bandeja se calcula al consultar los datos actuales. No existe todavía una cola de notificaciones, fechas límite, destinatarios, confirmación de lectura ni acciones de resolución independientes de los registros originales.</Hint>
    <div className="stats"><Metric label="Alertas calculadas" value={alerts.length} detail="Incidencias, recepciones y pedidos parciales"/><Metric label="Incidencias abiertas" value={data.incidents.filter(i=>i.status==='OPEN').length} detail="Requieren investigación"/><Metric label="Recepciones pendientes" value={data.transfers.filter(t=>t.status==='RECEIVING').length} detail="Con diferencia o verificación incompleta"/><Metric label="Pedidos parcialmente surtidos" value={data.orders.filter(o=>o.status==='PARTIAL').length} detail="No aptos para envío"/></div>
    <Panel title="Atención operativa" description="Selecciona un registro para consultar el módulo que debe resolverlo.">
      <div className="module-toolbar"><SearchField value={q} onChange={setQ} placeholder="Filtrar alertas"/></div>
      <Table headers={['Importancia','Tipo','Registro','Descripción','Detectado','Consultar']} rows={alerts.map(a=>({key:a.key,cells:[a.level,a.kind,<strong>{a.title}</strong>,a.detail,formatDate(a.when),<Link href={a.href} className="text-link">Abrir módulo</Link>]}))} empty="No existen alertas derivadas que coincidan con el filtro."/>
    </Panel>
  </>;
}

export function AuthorizationsPage({data}){
  return <>
    <Hint warning title="No hay un sistema de aprobaciones implementado">No se puede aprobar, rechazar ni simular una autorización real. Las aprobaciones deben tener solicitante, aprobador, permisos, ámbito, motivo, vigencia y evidencia registrada de forma inmutable.</Hint>
    <Panel title="Bandeja de autorizaciones" description="Estructura de trabajo prevista para responsables y supervisores.">
      <Table headers={['Solicitud','Solicitante','Operación','Justificación','Estado','Decisión']} rows={[]} empty="No hay endpoints ni solicitudes de autorización disponibles en este MVP."/>
    </Panel>
    <Panel title="Casos que requieren autorización" description="Políticas operativas pendientes de validación del negocio.">
      <div className="policy-grid">
        {[
          ['Cierre con faltantes','No marcar cumplimiento total cuando la diferencia está autorizada.'],
          ['Reasignación de mercancía','Preservar origen, destino, cantidad y custodia física.'],
          ['Salida excepcional','Registrar motivo, identidad verificable y autorización antes de despachar.'],
          ['Cancelación en tránsito','No liberar stock del origen hasta recuperar su custodia.']
        ].map(([title,desc])=><article className="policy-item" key={title}><strong>{title}</strong><p>{desc}</p><span>Requiere política aprobada</span></article>)}
      </div>
    </Panel>
  </>;
}

export function AdministrationPage({data}){
  const [tab,setTab]=useState('products'),[q,setQ]=useState('');
  const active=data.products.filter(p=>(p.sku+' '+p.name).toLowerCase().includes(q.toLowerCase()));
  return <>
    <Hint title="Catálogos de sólo lectura">Los catálogos mostrados provienen de PostgreSQL. Este MVP no incorpora edición de usuarios, sucursales, productos, roles ni permisos. Ningún control visual suplanta la autorización del backend.</Hint>
    <div className="module-tabs" role="tablist" aria-label="Secciones de administración">
      {['products','locations','roles'].map(k=><button role="tab" aria-selected={tab===k} key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{({products:'Productos',locations:'Ubicaciones',roles:'Usuarios y permisos'})[k]}</button>)}
    </div>
    {tab==='products'&&<Panel title="Catálogo de productos" description="Identificación por SKU; lotes y variantes quedan pendientes de definición.">
      <div className="module-toolbar"><SearchField value={q} onChange={setQ} placeholder="Buscar SKU o nombre"/></div>
      <Table headers={['SKU','Producto','Ubicaciones con stock','Existencia física total','Disponible calculado']} rows={active.map(p=>{
        const stocks=data.stocks.filter(s=>s.productId===p.id);
        return {key:p.id,cells:[<strong>{p.sku}</strong>,p.name,stocks.length,total(stocks,'physical'),stocks.reduce((n,s)=>n+stockAvailable(s),0)]};
      })} empty="No hay productos con ese filtro."/>
    </Panel>}
    {tab==='locations'&&<Panel title="Ubicaciones logísticas" description="Almacenes, bodegas, distribuidoras y puntos de venta.">
      <Table headers={['Nombre de ubicación','Productos con existencias','Unidades físicas','Unidades disponibles']} rows={data.locations.map(l=>{
        const stocks=data.stocks.filter(s=>s.locationId===l.id);
        return {key:l.id,cells:[<strong>{l.name}</strong>,stocks.length,total(stocks,'physical'),stocks.reduce((n,s)=>n+stockAvailable(s),0)]};
      })} empty="Sin ubicaciones."/>
    </Panel>}
    {tab==='roles'&&<Panel title="Usuarios y permisos" description="Módulo restringido hasta contar con autenticación real y autorización en NestJS.">
      <Unavailable title="Gestión de usuarios no implementada" description="El encabezado de demostración x-demo-actor no acredita identidad. No debe utilizarse para aprobar operaciones ni restringir el inventario." dependency="BE-07 Seguridad · PM-BA Matriz de permisos · QA-09"/>
    </Panel>}
  </>;
}
