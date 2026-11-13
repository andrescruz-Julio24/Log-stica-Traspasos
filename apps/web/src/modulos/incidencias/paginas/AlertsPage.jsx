'use client';
import { deriveAlerts } from '../utils/alerts';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { useState } from 'react';
import Link from 'next/link';
import {
  Hint,
  Metric,
  Panel,
  SearchField,
  Table,
  formatDate,
} from '../../../shared/ui/ModuleKit';

export function AlertsPage() {
  const { data, resources, complete } = useWorkspace();
  const [q, setQ] = useState('');
  const alerts = deriveAlerts(data, q);
  return (
    <>
      <Hint title="Alertas derivadas, no notificaciones persistidas">
        Esta bandeja se calcula al consultar los datos actuales. No existe
        todavía una cola de notificaciones, fechas límite, destinatarios,
        confirmación de lectura ni acciones de resolución independientes de los
        registros originales.
      </Hint>
      <div className="stats">
        <Metric
          label={
            complete ? 'Alertas calculadas' : 'Alertas de fuentes disponibles'
          }
          value={alerts.length}
          detail="Incidencias, recepciones y pedidos parciales"
        />
        <Metric
          label="Incidencias abiertas"
          value={
            resources.incidents?.status !== 'success'
              ? '—'
              : data.incidents.filter((i) => i.status === 'OPEN').length
          }
          detail="Requieren investigación"
        />
        <Metric
          label="Recepciones pendientes"
          value={
            resources.transfers?.status !== 'success'
              ? '—'
              : data.transfers.filter((t) => t.status === 'RECEIVING').length
          }
          detail="Con diferencia o verificación incompleta"
        />
        <Metric
          label="Pedidos parcialmente surtidos"
          value={
            resources.orders?.status !== 'success'
              ? '—'
              : data.orders.filter((o) => o.status === 'PARTIAL').length
          }
          detail="No aptos para envío"
        />
      </div>
      <Panel
        title="Atención operativa"
        description="Selecciona un registro para consultar el módulo que debe resolverlo."
      >
        <div className="module-toolbar">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Filtrar alertas"
          />
        </div>
        <Table
          headers={[
            'Importancia',
            'Tipo',
            'Registro',
            'Descripción',
            'Detectado',
            'Consultar',
          ]}
          rows={alerts.map((a) => ({
            key: a.key,
            cells: [
              a.level,
              a.kind,
              <strong key="column-1">{a.title}</strong>,
              a.detail,
              formatDate(a.when),
              <Link key="column-2" href={a.href} className="text-link">
                Abrir módulo
              </Link>,
            ],
          }))}
          empty={
            complete
              ? 'No existen alertas derivadas que coincidan con el filtro.'
              : 'Sin coincidencias entre las fuentes disponibles.'
          }
        />
      </Panel>
    </>
  );
}
