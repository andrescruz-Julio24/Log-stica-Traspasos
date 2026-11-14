'use client';
import styles from '../styles/ReturnResolutionForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
export function ReturnResolutionForm({ entry }) {
  const { act,busy }=useWorkspace();
  const mismatch=Number(entry.expected)!==Number(entry.intake.observed);
  function save(e) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    act(()=>submitOnce('/commercial-returns/'+entry.id+'/resolve',{
      usable:String(f.get('usable')).replace(',','.'),
      blocked:String(f.get('blocked')).replace(',','.'),
      reason:String(f.get('reason')).trim(),
      reconciliationRef:String(f.get('reconciliationRef')||'').trim()||undefined,
    }),()=>form.reset());
  }
  return <form className={styles.form} onSubmit={save}>
    <h4>Inspección final y autorización de reintegro (supervisor)</h4>
    <p>Recibido físicamente: {String(entry.intake.observed)} {entry.unit}. La suma de utilizable + bloqueado debe coincidir.</p>
    <label className="field">Cantidad utilizable (vuelve a disponible)
      <input required name="usable" defaultValue="0" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?"/>
    </label>
    <label className="field">Cantidad bloqueada/dañada (no disponible)
      <input required name="blocked" defaultValue={String(entry.intake.observed)} inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?"/>
    </label>
    <label className="field">Decisión y condición comprobada
      <textarea required name="reason" rows={2} maxLength={500}/>
    </label>
    {mismatch&&<label className="field">Referencia de conciliación por diferencia (obligatoria)
      <input required name="reconciliationRef" maxLength={200}/>
    </label>}
    <button className="primary" disabled={busy}>Autorizar reintegro después de inspección</button>
  </form>;
}
