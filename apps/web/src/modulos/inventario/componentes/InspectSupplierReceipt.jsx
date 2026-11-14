'use client';
import { useRef } from 'react';
import styles from '../styles/InspectSupplierReceipt.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function InspectSupplierReceipt({ receipt }) {
  const { act, busy } = useWorkspace();
  const observedAt = useRef(null);
  const pending = receipt.lines.filter(l => Number(l.expected) > Number(l.presented));
  if (!pending.length) return <p>Todo lo declarado fue inspeccionado. El material bloqueado puede devolverse mediante autorización.</p>;
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const items = pending.map(l => ({
      receiptLineId: l.id,
      presented: String(f.get('presented-' + l.id) || '0').replace(',', '.'),
      accepted: String(f.get('accepted-' + l.id) || '0').replace(',', '.'),
      blocked: String(f.get('blocked-' + l.id) || '0').replace(',', '.'),
    })).filter(x => Number(x.presented) > 0);
    if (!items.length) return;
    act(() => submitOnce('/supplier-receipts/' + receipt.id + '/inspect', {
      observedAt: observedAt.current || (observedAt.current = new Date().toISOString()),
      notes: String(f.get('notes') || '').trim() || undefined,
      evidenceRef: String(f.get('evidenceRef') || '').trim() || undefined,
      items,
    }), () => { form.reset(); observedAt.current = null; });
  }
  return <form onSubmit={save} className={styles.form}>
    <h3>Inspección física y pesaje</h3>
    {pending.map(l => <fieldset key={l.id} className={styles.line}>
      <legend>{l.product.name} · {l.product.sku} · Pendiente: {(Number(l.expected)-Number(l.presented)).toFixed(3)} {l.unit}</legend>
      <label className="field">Presentado
        <input name={'presented-' + l.id} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" defaultValue="0" />
      </label>
      <label className="field">Aceptado y utilizable
        <input name={'accepted-' + l.id} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" defaultValue="0" />
      </label>
      <label className="field">Bloqueado / revisión
        <input name={'blocked-' + l.id} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" defaultValue="0" />
      </label>
    </fieldset>)}
    <label className="field">Observaciones y motivo de bloqueo
      <textarea name="notes" rows={2} maxLength={500} />
    </label>
    <label className="field">Referencia de firma / bitácora / evidencia
      <input name="evidenceRef" maxLength={200}/>
    </label>
    <p className={styles.note}>Presentado debe ser igual a aceptado + bloqueado. Lo bloqueado se conserva físicamente pero no puede reservarse.</p>
    <button type="submit" className="primary" disabled={busy}>Confirmar inspección y actualizar existencias</button>
  </form>;
}
