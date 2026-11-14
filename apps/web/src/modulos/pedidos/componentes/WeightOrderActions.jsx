'use client';
import styles from '../styles/WeightOrderActions.module.css';
import { useRef } from 'react';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
import { formatDate } from '../../../shared/ui/ModuleKit';
import Link from 'next/link';
export function WeightOrderActions({ order, line }) {
  const { data, act, busy } = useWorkspace();
  const customerTime = useRef(null);
  const trips = data.trips.filter(t => t.orderId === order.id && t.status === 'ACTIVE');
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
      ...(f.get('tripId') ? { tripId: f.get('tripId') } : {}),
    }));
  }
  function confirmClient(event, shipment) {
    event.preventDefault();
    const form=event.currentTarget;
    const f=new FormData(form);
    act(()=>submitOnce('/weight-orders/shipments/'+shipment.id+'/confirm',{
      receiverName:String(f.get('receiverName')).trim(),
      acceptedKg:String(f.get('acceptedKg')).replace(',','.'),
      rejectedKg:String(f.get('rejectedKg')).replace(',','.'),
      observedAt:customerTime.current||(customerTime.current=new Date().toISOString()),
      notes:String(f.get('notes')||'').trim()||undefined,
      evidenceRef:String(f.get('evidenceRef')||'').trim()||undefined,
    }),()=>{form.reset();customerTime.current=null});
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
      <label className="field">Viaje con chofer asignado (opcional)
        <select name="tripId" defaultValue=""><option value="">Sin viaje registrado</option>
          {trips.map(t=><option key={t.id} value={t.id}>Viaje {t.id.slice(0,8)} activo</option>)}
        </select>
      </label>
      <button className="primary" disabled={busy}>Despachar peso realmente medido</button>
    </form>}
    {line.shipments.map(ship=><div key={ship.id} className={styles.shipment}>
      <strong>Salida {formatDate(ship.dispatchedAt)}</strong>
      <p>Teórico {String(ship.nominalKg)} kg · Real {String(ship.actualKg)} kg ·
        Diferencia {String(ship.differenceKg)} kg</p>
      <p>Referencia para revisión comercial: <code>{ship.accountingRef}</code>.
        No se generó importe. La salida no acredita recepción del cliente.</p>
      {ship.clientReception ? <p>
        <strong>Conformidad del cliente:</strong> {ship.clientReception.receiverName} ·
        {String(ship.clientReception.acceptedKg)} kg aceptados;
        {String(ship.clientReception.rejectedKg)} kg rechazados.
        {Number(ship.clientReception.rejectedKg)>0?' Existe devolución pendiente de inspección.':''}
      </p> : <form className={styles.receiptForm} onSubmit={e=>confirmClient(e,ship)}>
        <h4>Confirmar recepción efectiva del cliente</h4>
        <label className="field">Persona que recibió<input name="receiverName" required maxLength={120}/></label>
        <label className="field">Peso aceptado (kg)<input name="acceptedKg" required inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,3})?" defaultValue={String(ship.actualKg)}/></label>
        <label className="field">Peso rechazado (kg)<input name="rejectedKg" required inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,3})?" defaultValue="0"/></label>
        <label className="field">Motivo si existe rechazo<input name="notes" maxLength={500}/></label>
        <label className="field">Referencia de recibido/acuse<input name="evidenceRef" maxLength={200}/></label>
        <button type="submit" className="primary" disabled={busy}>Confirmar entrega comercial pesada</button>
        <small>La suma aceptado + rechazado debe igualar el peso efectivamente presentado. Un rechazo abre devolución sin añadir existencias.</small>
      </form>}
      <Link href="/devoluciones" className="text-link">Consultar o reportar devolución de mercancía cargada</Link>
    </div>)}
    {order.dueAt && <small>Compromiso: {formatDate(order.dueAt)}</small>}
  </div>;
}
