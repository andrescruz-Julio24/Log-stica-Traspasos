'use client';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';
import { priorities } from '../data/priorities';
import { useOrderHistory } from '../hooks/useOrderHistory';
export function OrderHistory({ id }) {
  const { events, error } = useOrderHistory(id);
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
