'use client';
import { useRef } from 'react';
import styles from '../styles/ReturnIntakeForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
export function ReturnIntakeForm({ entry }) {
  const { act,busy }=useWorkspace();
  const moment=useRef(null);
  function save(e) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    act(()=>submitOnce('/commercial-returns/'+entry.id+'/intake',{
      observed:String(f.get('observed')).replace(',','.'),
      observedAt:moment.current||(moment.current=new Date().toISOString()),
      conditionNote:String(f.get('conditionNote')).trim(),
      evidenceRef:String(f.get('evidenceRef')||'').trim()||undefined,
    }),()=>{form.reset();moment.current=null});
  }
  return <form className={styles.form} onSubmit={save}>
    <h4>Registrar regreso físico (sin liberar inventario)</h4>
    <label className="field">Cantidad realmente recibida ({entry.unit})
      <input required name="observed" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?"
        placeholder={String(entry.expected)}/>
    </label>
    <label className="field">Revisión física inicial: condición y diferencias
      <textarea required name="conditionNote" maxLength={500} rows={2}/>
    </label>
    <label className="field">Folio, bitácora o evidencia
      <input name="evidenceRef" maxLength={200}/>
    </label>
    <button className="secondary" disabled={busy}>Registrar llegada y emitir papeleta a Contabilidad</button>
    <p>Si el peso no coincide se abrirá incidencia. El registro no suma stock.</p>
  </form>;
}
