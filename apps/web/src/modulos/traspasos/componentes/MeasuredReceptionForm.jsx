'use client';
import { useRef } from 'react';
import styles from '../styles/MeasuredReceptionForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function MeasuredReceptionForm({ transfer, dispatch, unit }) {
  const { act, busy } = useWorkspace();
  const observedAt = useRef(null);
  const done = dispatch.receipts.reduce((n, r) => n + Number(r.presented), 0);
  const left = Number(dispatch.quantity) - done;
  if (left <= 0 || transfer.status === 'CLOSED') return null;
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/measured-transfers/' + transfer.id + '/receive', {
      dispatchId: dispatch.id,
      presented: String(f.get('presented')).replace(',', '.'),
      accepted: String(f.get('accepted')).replace(',', '.'),
      blocked: String(f.get('blocked')).replace(',', '.'),
      observedAt: observedAt.current || (observedAt.current = new Date().toISOString()),
      notes: String(f.get('notes') || '').trim() || undefined,
      evidenceRef: String(f.get('evidenceRef') || '').trim() || undefined,
    }), () => { form.reset(); observedAt.current = null; });
  }
  return <form className={styles.form} onSubmit={save}>
    <strong>Recepción del despacho ({left.toFixed(3)} {unit} en tránsito)</strong>
    <label className="field">Presentado físicamente
      <input name="presented" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
    </label>
    <label className="field">Aceptado para usar
      <input name="accepted" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
    </label>
    <label className="field">Bloqueado o en revisión
      <input name="blocked" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" defaultValue="0" />
    </label>
    <label className="field">Notas / motivo de bloqueo
      <input name="notes" maxLength={500}/>
    </label>
    <label className="field">Bitácora / firma o evidencia
      <input name="evidenceRef" maxLength={200} />
    </label>
    <button className="primary" disabled={busy}>Confirmar pesaje y recepción</button>
    <small>Lo presentado debe coincidir con aceptado + bloqueado; no se libera lo dañado al disponible.</small>
  </form>;
}
