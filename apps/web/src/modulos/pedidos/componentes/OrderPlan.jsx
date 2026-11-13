'use client';
import { priorities } from '../data/priorities';
import { submit } from '../../../shared/services/apiClient';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
export function OrderPlan({ order }) {
  const { act, busy } = useWorkspace();
  function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act(() =>
      submit('/orders/' + order.id + '/plan', {
        priority: f.get('priority'),
        reason: f.get('reason'),
        ...(f.get('dueAt')
          ? { dueAt: new Date(f.get('dueAt')).toISOString() }
          : {}),
      }),
    );
  }
  return (
    <details>
      <summary>
        {priorities[order.priority]} ·{' '}
        {order.dueAt
          ? new Date(order.dueAt).toLocaleString('es-MX')
          : 'Sin compromiso'}
      </summary>
      <form onSubmit={save}>
        <label>
          Prioridad
          <select name="priority" defaultValue={order.priority}>
            {Object.entries(priorities).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nuevo compromiso
          <input name="dueAt" type="datetime-local" />
        </label>
        <label>
          Motivo
          <input name="reason" required />
        </label>
        <button disabled={busy || order.status === 'CANCELLED'}>
          Actualizar plan
        </button>
      </form>
    </details>
  );
}
