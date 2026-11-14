'use client';
import styles from '../styles/TransferSchedulePanel.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
import { Panel, formatDate } from '../../../shared/ui/ModuleKit';

export function TransferSchedulePanel({ transfer, orders, events }) {
  const { busy, act } = useWorkspace();
  const customers = orders.filter(order =>
    order.destinationId === transfer.destinationId && order.dueAt &&
    transfer.lines.some(line => line.reservations?.some(res =>
      order.lines.some(l => l.id === res.orderLineId))));
  function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/transfers/' + transfer.id + '/schedules', {
      orderId: String(f.get('orderId')),
      departureAt: new Date(String(f.get('departureAt'))).toISOString(),
      expectedArrivalAt: new Date(String(f.get('expectedArrivalAt'))).toISOString(),
      reason: String(f.get('reason')).trim(),
    }), () => form.reset());
  }
  return <Panel title="Programación anticipada vinculada a cliente"
    description="T-21: no basta registrar una fecha. La salida debe estar asociada a reserva real y llegar antes del compromiso del cliente.">
    <form className={styles.form} onSubmit={save}>
      <label className="field">Cliente con reserva asociada
        <select name="orderId" required defaultValue=""><option value="">Seleccionar</option>
          {customers.map(o=><option key={o.id} value={o.id}>{o.code} · {o.customer} · Entrega {formatDate(o.dueAt)}</option>)}
        </select>
      </label>
      <label className="field">Salida anticipada prevista<input type="datetime-local" name="departureAt" required/></label>
      <label className="field">Llegada prevista antes del compromiso
        <input type="datetime-local" name="expectedArrivalAt" required/>
      </label>
      <label className="field">Motivo de programación
        <input name="reason" required maxLength={500} placeholder="Preparación anticipada para mañana"/>
      </label>
      <button className="primary" type="submit" disabled={busy||!customers.length}>Guardar programación</button>
    </form>
    {customers.length===0&&<p className={styles.note}>Para programar con cliente, primero vincula una reserva de este traspaso a su pedido con fecha de compromiso.</p>}
    <div className={styles.events}>
      {events.map(e=><p key={e.id}>
        <strong>{e.order.code}</strong> · Salida {formatDate(e.departureAt)} ·
        Llegada {formatDate(e.expectedArrivalAt)} ·
        Compromiso {formatDate(e.order.dueAt)} · {e.reason} · {e.recordedBy}
      </p>)}
      {!events.length&&<p className={styles.note}>Sin programación anticipada registrada.</p>}
    </div>
  </Panel>;
}
