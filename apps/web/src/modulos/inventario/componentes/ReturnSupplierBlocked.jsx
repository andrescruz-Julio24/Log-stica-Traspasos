'use client';
import styles from '../styles/ReturnSupplierBlocked.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function ReturnSupplierBlocked({ line }) {
  const { act, busy } = useWorkspace();
  const already = line.returns.reduce((sum, r) => sum + Number(r.quantity), 0);
  const pending = Number(line.blocked) - already;
  if (pending <= 0) return null;
  function submitReturn(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    act(() => submitOnce('/supplier-receipts/lines/' + line.id + '/return-blocked', {
      quantity: String(f.get('quantity')).replace(',', '.'),
      reason: String(f.get('reason')).trim(),
    }), () => form.reset());
  }
  return <form className={styles.form} onSubmit={submitReturn}>
    <strong>Retornar material bloqueado: {pending.toFixed(3)} {line.unit}</strong>
    <label className="field">Cantidad de regreso al proveedor
      <input name="quantity" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
    </label>
    <label className="field">Motivo y folio para Contabilidad
      <input name="reason" required maxLength={500} />
    </label>
    <button type="submit" className="secondary" disabled={busy}>Autorizar salida de devolución</button>
    <small>Requiere supervisor. No libera mercancía bloqueada como disponible.</small>
  </form>;
}
