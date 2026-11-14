'use client';
import styles from '../styles/CreateWeightReturn.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function CreateWeightReturn() {
  const { data,act,busy }=useWorkspace();
  const options=data.weightOrders.flatMap(order=>order.weightLines.flatMap(line=>
    line.shipments.filter(sh=>!data.commercialReturns.some(ret=>ret.weightShipmentId===sh.id))
      .map(sh=>({shipment:sh,order,line}))));
  function save(e) {
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
    act(()=>submitOnce('/commercial-returns/from-weight-shipment',{
      weightShipmentId:f.get('weightShipmentId'),reason:String(f.get('reason')).trim(),
    }),()=>form.reset());
  }
  return <form className={styles.form} onSubmit={save}>
    <label className="field">Pedido cargado que regresa
      <select name="weightShipmentId" required defaultValue=""><option value="">Seleccionar salida comercial</option>
        {options.map(({shipment,order})=><option key={shipment.id} value={shipment.id}>
          {order.code} · {order.customer} · {String(shipment.actualKg)} kg</option>)}
      </select>
    </label>
    <label className="field">Motivo de la devolución
      <input name="reason" required maxLength={500} placeholder="Ej. cancelado en ruta, pesaje por revisar"/>
    </label>
    <button className="primary" disabled={busy||!options.length}>Abrir expediente de devolución por peso</button>
    <p className={styles.note}>La devolución se registra sin reintegrar automáticamente los kilogramos al inventario.</p>
  </form>;
}
