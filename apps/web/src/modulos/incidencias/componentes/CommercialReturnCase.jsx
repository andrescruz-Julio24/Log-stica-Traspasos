'use client';
import styles from '../styles/CommercialReturnCase.module.css';
import { ReturnIntakeForm } from './ReturnIntakeForm';
import { ReturnResolutionForm } from './ReturnResolutionForm';
import { formatDate } from '../../../shared/ui/ModuleKit';
export function CommercialReturnCase({ entry }) {
  const isDifferent=entry.intake&&Number(entry.expected)!==Number(entry.intake.observed);
  return <details className={styles.case}>
    <summary><strong>{entry.order.code}</strong> · {entry.product.sku}
      {' · '}Esperado {String(entry.expected)} {entry.unit}
      {' · '}{entry.status==='AWAITING_RETURN'?'Pendiente de regreso':
        entry.status==='INSPECTION_REQUIRED'?'En inspección':'Resuelta'}</summary>
    <div className={styles.details}>
      <p>Cliente: {entry.order.customer} · Motivo: {entry.reason} · {formatDate(entry.createdAt)}</p>
      {entry.intake&&<p>Regresó: {String(entry.intake.observed)} {entry.unit};
        {' '}diferencia { (Number(entry.intake.observed)-Number(entry.expected)).toFixed(3)}
        {' · '}revisión: {entry.intake.conditionNote}</p>}
      {entry.accountingNotice&&<p className={styles.accounting}>Papeleta a Contabilidad:
        {' '}<code>{entry.accountingNotice.reference}</code>
        {' · '}{entry.accountingNotice.requiresReconciliation?'Diferencia por conciliar':'Sin diferencia de cantidad'}</p>}
      {isDifferent&&<p className={styles.warning}>No reintegrar sin una revisión y conciliación autorizadas.</p>}
      {entry.status==='AWAITING_RETURN'&&<ReturnIntakeForm entry={entry}/>}
      {entry.status==='INSPECTION_REQUIRED'&&<ReturnResolutionForm entry={entry}/>}
      {entry.status==='RESOLVED'&&<p>Inspección autorizada por {entry.resolvedBy} · {formatDate(entry.resolvedAt)}</p>}
      {entry.incidents.length>0&&<p>{entry.incidents.length} incidencia(s) vinculadas:
        {' '}{entry.incidents.map(i=>i.type+' ('+i.status+')').join('; ')}</p>}
    </div>
  </details>;
}
