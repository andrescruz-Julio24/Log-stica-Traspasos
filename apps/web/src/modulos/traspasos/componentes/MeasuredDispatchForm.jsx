'use client';
import styles from '../styles/MeasuredDispatchForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function MeasuredDispatchForm({ transfer, line }) {
  const { act, busy } = useWorkspace();
  const available = Number(line.reserved) - Number(line.dispatched);
  if (available <= 0 || transfer.status === 'CLOSED') return null;
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/measured-transfers/' + transfer.id + '/dispatch', {
      lineId: line.id, quantity: String(f.get('quantity')).replace(',', '.'),
      custodian: String(f.get('custodian')).trim(),
    }), () => form.reset());
  }
  return <form className={styles.form} onSubmit={save}>
    <label className="field">Peso/cantidad real de salida (máx. {available.toFixed(3)} {line.unit})
      <input name="quantity" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
    </label>
    <label className="field">Conductor o custodio
      <input name="custodian" required maxLength={150} />
    </label>
    <button className="primary" disabled={busy}>Registrar salida y tránsito</button>
  </form>;
}
