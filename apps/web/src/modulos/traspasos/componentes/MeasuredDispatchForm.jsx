'use client';
import styles from '../styles/MeasuredDispatchForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function MeasuredDispatchForm({ transfer, line }) {
  const { data, act, busy } = useWorkspace();
  const trips = data.trips.filter(t => t.transferId === transfer.id && t.status === 'ACTIVE');
  const available = Number(line.reserved) - Number(line.dispatched);
  if (available <= 0 || transfer.status === 'CLOSED') return null;
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/measured-transfers/' + transfer.id + '/dispatch', {
      lineId: line.id, quantity: String(f.get('quantity')).replace(',', '.'),
      custodian: String(f.get('custodian')).trim(),
      ...(f.get('tripId') ? { tripId: f.get('tripId') } : {}),
    }), () => form.reset());
  }
  return <form className={styles.form} onSubmit={save}>
    <label className="field">Peso/cantidad real de salida (máx. {available.toFixed(3)} {line.unit})
      <input name="quantity" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
    </label>
    <label className="field">Conductor o custodio
      <input name="custodian" required maxLength={150} />
    </label>
    <label className="field">Viaje y chofer registrado (recomendado)
      <select name="tripId" defaultValue=""><option value="">Sin viaje registrado</option>
        {trips.map(t => <option key={t.id} value={t.id}>Viaje {t.id.slice(0,8)} · {t.status}</option>)}
      </select>
    </label>
    <button className="primary" disabled={busy}>Registrar salida y tránsito</button>
  </form>;
}
