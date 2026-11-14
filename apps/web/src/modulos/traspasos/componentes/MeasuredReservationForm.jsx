'use client';
import styles from '../styles/MeasuredReservationForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function MeasuredReservationForm({ transfer, line }) {
  const { act, busy } = useWorkspace();
  const left = Number(line.requested) - Number(line.reserved);
  if (left <= 0 || transfer.status === 'CLOSED') return null;
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/measured-transfers/' + transfer.id + '/reserve', {
      lineId: line.id, quantity: String(f.get('quantity')).replace(',', '.'),
    }), () => form.reset());
  }
  return <form className={styles.form} onSubmit={save}>
    <label className="field">Reservar {line.unit} (máx. {left.toFixed(3)})
      <input name="quantity" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
    </label>
    <button className="secondary" disabled={busy}>Reservar en origen</button>
  </form>;
}
