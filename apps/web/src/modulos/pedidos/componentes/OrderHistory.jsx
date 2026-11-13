'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../shared/services/apiClient';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';
import { priorities } from '../data/priorities';
export function OrderHistory({ id }) {
  const [events, set] = useState([]),
    [error, fail] = useState('');
  useEffect(() => {
    let live = true;
    api('/orders/' + id + '/history')
      .then((r) => {
        if (live) set(r);
      })
      .catch((e) => {
        if (live) fail(e.message);
      });
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <Panel title="Historial de compromisos y prioridades">
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <Table
          headers={[
            'Registrado',
            'Prioridad',
            'Compromiso',
            'Responsable',
            'Motivo',
          ]}
          rows={events.map((e) => {
            const plan = e.data.after || e.data;
            return {
              key: e.id,
              cells: [
                formatDate(e.createdAt),
                priorities[plan.priority || 'NORMAL'],
                plan.dueAt ? formatDate(plan.dueAt) : 'Sin compromiso',
                e.actor,
                e.data.reason || 'Alta del pedido',
              ],
            };
          })}
        />
      )}
    </Panel>
  );
}
