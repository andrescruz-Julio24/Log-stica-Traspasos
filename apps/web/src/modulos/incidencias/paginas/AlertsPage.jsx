'use client';
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
  const { data } = useWorkspace();
  const [q, setQ] = useState('');
  const alerts = [
    ...data.incidents
      .filter((i) => i.status === 'OPEN')
      .map((i) => ({
        key: 'incident:' + i.id,
        kind: 'Incidencia abierta',
        title: i.type,
        detail: i.notes,
        level: 'Crítica',
        when: i.createdAt,
        href: '/incidencias',
      })),
    ...data.transfers
      .filter((t) => t.status === 'RECEIVING')
      .map((t) => ({
        key: 'receiving:' + t.id,
        kind: 'Recepción por conciliar',
        title: t.code,
        detail: t.origin.name + ' → ' + t.destination.name,
        level: 'Revisión',
        when: t.createdAt,
        href: '/recepciones',
      })),
    ...data.orders
      .filter((o) => o.status === 'BLOCKED')
      .map((o) => ({
        key: 'held:' + o.id,
        kind: 'Pedido retenido',
        title: o.code + ' · ' + o.customer,
        detail: 'Revisar unidades y responsable por SKU',
        level: 'Bloqueante',
        when: o.createdAt,
        href: '/pedidos/' + o.id,
      })),
    ...data.orders
      .filter((o) => o.status === 'PARTIAL')
      .map((o) => ({
        key: 'order:' + o.id,
        kind: 'Abastecimiento parcial',
        title: o.code + ' · ' + o.customer,
        detail:
          'Faltantes: ' +
          o.lines.reduce(
            (n, l) => n + Math.max(0, l.required - l.accepted),
            0,
          ) +
          ' unidades',
        level: 'Pendiente',
        when: o.createdAt,
        href: '/pedidos',
      })),
  ].filter((a) =>
    (a.kind + ' ' + a.title + ' ' + a.detail)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
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
          label="Alertas calculadas"
          value={alerts.length}
          detail="Incidencias, recepciones y pedidos parciales"
        />
        <Metric
          label="Incidencias abiertas"
          value={data.incidents.filter((i) => i.status === 'OPEN').length}
          detail="Requieren investigación"
        />
        <Metric
          label="Recepciones pendientes"
          value={data.transfers.filter((t) => t.status === 'RECEIVING').length}
          detail="Con diferencia o verificación incompleta"
        />
        <Metric
          label="Pedidos parcialmente surtidos"
          value={data.orders.filter((o) => o.status === 'PARTIAL').length}
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
          empty="No existen alertas derivadas que coincidan con el filtro."
        />
      </Panel>
    </>
  );
}
