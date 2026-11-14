'use client';
import styles from '../styles/WeightOrderActions.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
import { formatDate } from '../../../shared/ui/ModuleKit';
import Link from 'next/link';
export function WeightOrderActions({ order, line }) {
  const { act, busy } = useWorkspace();
  const remaining = Math.max(0, Number(line.plannedKg) - Number(line.reservedKg) - Number(line.dispatchedKg));
  function reserve(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act(() => submitOnce('/weight-orders/' + line.id + '/reserve', {
      quantityKg: String(f.get('quantityKg')).replace(',', '.'),
    }));
  }
  function dispatch(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act(() => submitOnce('/weight-orders/' + line.id + '/dispatch', {
      actualKg: String(f.get('actualKg')).replace(',', '.'),
      custodian: String(f.get('custodian')).trim(),
      documentRef: String(f.get('documentRef') || '').trim() || undefined,
    }));
  }
  return <div className={styles.content}>
    <p><strong>{line.product.name} · {line.product.sku}</strong> — {String(line.plannedKg)} kg requeridos;
      {' '}{line.estimatedBoxes ?? '—'} cajas estimadas,
      {' '}{String(line.reservedKg)} kg reservados,
      {' '}{String(line.dispatchedKg)} kg despachados</p>
    {remaining > 0 && !line.shipments.length && <form onSubmit={reserve} className={styles.form}>
      <label className="field">Reservar kg verificados
        <input name="quantityKg" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?"
          defaultValue={remaining.toFixed(3)}/>
      </label>
      <button className="secondary" disabled={busy}>Reservar peso comercial</button>
    </form>}
    {!line.shipments.length && Number(line.reservedKg) >= Number(line.plannedKg) && <form onSubmit={dispatch} className={styles.form}>
      <label className="field">Peso real de báscula (kg)
        <input required name="actualKg" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?"
          placeholder="29.400"/>
      </label>
      <label className="field">Custodio/chofer de la salida<input required name="custodian" maxLength={150}/></label>
      <label className="field">Remisión o bitácora (opcional)<input name="documentRef" maxLength={200}/></label>
      <button className="primary" disabled={busy}>Despachar peso realmente medido</button>
    </form>}
    {line.shipments.map(ship=><div key={ship.id} className={styles.shipment}>
      <strong>Salida {formatDate(ship.dispatchedAt)}</strong>
      <p>Teórico {String(ship.nominalKg)} kg · Real {String(ship.actualKg)} kg ·
        Diferencia {String(ship.differenceKg)} kg</p>
      <p>Referencia para revisión comercial: <code>{ship.accountingRef}</code>.
        No se generó importe ni se declaró recepción del cliente.</p>
      <Link href="/devoluciones" className="text-link">Consultar o reportar devolución de mercancía cargada</Link>
    </div>)}
    {order.dueAt && <small>Compromiso: {formatDate(order.dueAt)}</small>}
  </div>;
}
