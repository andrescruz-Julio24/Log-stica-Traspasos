'use client';
import styles from '../styles/PickForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { activeReserved } from '../../../shared/utils/quantities';
import { submit } from '../../../shared/services/apiClient';

export function PickForm({ transfer, line }) {
  const { act, busy } = useWorkspace();
  function save(e) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    act(() =>
      submit('/transfers/' + transfer.id + '/picking', {
        transferLineId: line.id,
        quantity: Number(fields.get('quantity')),
        version: line.pickVersion,
        location: fields.get('location'),
        note: fields.get('note'),
      }),
    );
  }
  return (
    <form className={styles.form} onSubmit={save}>
      <label>
        Unidades separadas ahora
        <input
          name="quantity"
          type="number"
          min="0"
          max={activeReserved(line)}
          required
          defaultValue={line.picked}
        />
      </label>
      <label>
        Ubicación de picking
        <input name="location" required placeholder="Pasillo o anaquel" />
      </label>
      <label>
        Motivo si hay diferencia
        <input name="note" />
      </label>
      <button disabled={busy || !activeReserved(line)}>Confirmar conteo</button>
    </form>
  );
}
