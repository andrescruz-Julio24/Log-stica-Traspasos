'use client';
import styles from '../styles/TripForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
export function TripForm() {
  const { data, busy, act } = useWorkspace();
  function create(e) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    const ref=String(f.get('target'));
    if(!ref)return;
    act(()=>submitOnce('/trips',{
      ...(ref.startsWith('tr:')?{transferId:ref.slice(3)}:{orderId:ref.slice(3)}),
      plannedDepartureAt:new Date(String(f.get('departure'))).toISOString(),
      ...(f.get('arrival')?{plannedArrivalAt:new Date(String(f.get('arrival'))).toISOString()}:{}),
    }),()=>form.reset());
  }
  return <form onSubmit={create} className={styles.form}>
    <h3>Programar viaje</h3>
    <label className="field">Movimiento
      <select name="target" defaultValue="" required>
        <option value="">Seleccionar</option>
        {data.transfers.filter(t=>!['CLOSED','CANCELLED'].includes(t.status)).map(t=>
          <option key={'tr'+t.id} value={'tr:'+t.id}>Traspaso {t.code} · {t.origin.name} → {t.destination.name}</option>)}
        {data.orders.filter(o=>o.status!=='CANCELLED').map(o=>
          <option key={'or'+o.id} value={'or:'+o.id}>Entrega cliente {o.code} · {o.customer}</option>)}
      </select>
    </label>
    <label className="field">Salida prevista<input type="datetime-local" name="departure" required/></label>
    <label className="field">Llegada prevista (opcional)<input type="datetime-local" name="arrival"/></label>
    <button className="primary" disabled={busy}>Registrar viaje</button>
  </form>;
}
export function TripAssignment({ trip }) {
  const { data,busy,act }=useWorkspace();
  function assign(e) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    const driver=data.drivers.find(d=>d.id===f.get('driverId'));
    act(()=>submitOnce('/trips/'+trip.id+'/assign',{
      driverId:f.get('driverId'),provisional:driver?.category==='SUPPORT',
      reason:String(f.get('reason')).trim(),
      ...(driver?.category==='SUPPORT' && f.get('validUntil')
        ? {validUntil:new Date(String(f.get('validUntil'))).toISOString()}:{}),
    }),()=>form.reset());
  }
  const current=trip.assignments.at(-1);
  return <div className={styles.assignment}>
    <strong>{trip.transfer?.code||trip.order?.code||trip.id} · {trip.status}</strong>
    <p>Salida {new Date(trip.plannedDepartureAt).toLocaleString()} · Chofer actual:
      {' '}{current?.driver.fullName||'Sin asignar'}{current?.provisional?' (provisional)':''}</p>
    <form onSubmit={assign} className={styles.form}>
      <label className="field">Asignar o sustituir chofer
        <select name="driverId" required defaultValue=""><option value="">Seleccionar</option>
          {data.drivers.filter(d=>d.enabled&&d.available).map(d=>
            <option key={d.id} value={d.id}>{d.fullName} · {d.category==='SUPPORT'?'Apoyo':'Habitual'}</option>)}
        </select>
      </label>
      <label className="field">Motivo y autorización del relevo
        <input name="reason" required maxLength={500} placeholder="Ej. faltó conductor habitual"/>
      </label>
      <label className="field">Vigencia del apoyo provisional (si aplica)
        <input name="validUntil" type="datetime-local"/>
      </label>
      <button className="secondary" disabled={busy}>Registrar asignación autorizada</button>
    </form>
    {trip.status==='PLANNED' && <button type="button" disabled={busy||!current}
      className="primary" onClick={()=>act(()=>submitOnce('/trips/'+trip.id+'/start',{}))}>Iniciar viaje</button>}
    {trip.status==='ACTIVE' && <button type="button" disabled={busy}
      className="secondary" onClick={()=>act(()=>submitOnce('/trips/'+trip.id+'/finish',{}))}>Finalizar viaje</button>}
    {trip.assignments.length>0 && <details>
      <summary>Historial completo de choferes ({trip.assignments.length})</summary>
      <ol>{trip.assignments.map(a=><li key={a.id}>{a.driver.fullName}
        {a.provisional?' · Provisional hasta '+new Date(a.validUntil).toLocaleString():''}
        {' · '}{a.reason} · Por {a.assignedBy} · {new Date(a.assignedAt).toLocaleString()}</li>)}</ol>
    </details>}
  </div>;
}
