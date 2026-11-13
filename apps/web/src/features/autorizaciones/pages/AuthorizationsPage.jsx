'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Empty, Hint, Metric, Panel, SearchField, Status, Table, Unavailable, formatDate, stockAvailable } from '../../../shared/ui/ModuleKit';
import { sumField } from '../../../shared/utils/quantities';

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
