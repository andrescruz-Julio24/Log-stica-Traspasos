'use client';
import styles from '../styles/ApplyInventoryCount.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function ApplyInventoryCount({ observation }) {
  const { act, busy } = useWorkspace();
  const old = observation.stockPhysicalSnapshot;
  const desired = Number(observation.quantity);
  const delta = old === null ? null : desired - old;
  function apply(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const reason = String(f.get('reason') || '').trim();
    if (!reason) return;
    act(() => submitOnce('/inventory-observations/' + observation.id + '/apply', { reason }),
      () => form.reset());
  }
  return (
    <details className={styles.control}>
      <summary>Aplicar al inventario oficial</summary>
      <form onSubmit={apply} className={styles.form}>
        <p>Saldo al contar: <strong>{old === null ? 'sin registro' : old}</strong>
          {' · '}Conteo validado: <strong>{desired} piezas</strong>
          {' · '}Diferencia: <strong>{delta === null ? 'alta inicial' : (delta > 0 ? '+' : '') + delta}</strong>
        </p>
        <label className="field">Motivo documentado del ajuste
          <textarea name="reason" rows={2} maxLength={500} required
            placeholder="Causa comprobada de la diferencia, revisión y referencia" />
        </label>
        <button type="submit" className="primary" disabled={busy}>
          Registrar ajuste autorizado
        </button>
        <small>Solo supervisor. Si cambió el saldo desde el conteo o la corrección compromete unidades reservadas/bloqueadas, la operación será rechazada.</small>
      </form>
    </details>
  );
}
