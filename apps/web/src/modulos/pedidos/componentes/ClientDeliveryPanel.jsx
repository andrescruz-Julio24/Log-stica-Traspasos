'use client';
import styles from '../styles/ClientDeliveryPanel.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { useRef } from 'react';
import { LocalStockForm } from './LocalStockForm';
import { submitOnce } from '../../../shared/services/apiClient';
import { Panel, Table, formatDate } from '../../../shared/ui/ModuleKit';

function ClientReceptionForm({ shipment }) {
  const { busy, act } = useWorkspace();
  const receptionTime = useRef(null);
  const pending = shipment.lines.map((line) => {
    const registered = shipment.receptions.flatMap((r) => r.lines)
      .filter((r) => r.shipmentLineId === line.id)
      .reduce((n, r) => n + r.accepted + r.rejected, 0);
    return { line, left: line.quantity - registered };
  }).filter(({ left }) => left > 0);
  if (!pending.length) return <p className={styles.notice}>Despacho ya registrado como presentado en su totalidad.</p>;
  function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const items = pending.map(({ line }) => ({
      shipmentLineId: line.id,
      accepted: Number(f.get('accepted-' + line.id) || 0),
      rejected: Number(f.get('rejected-' + line.id) || 0),
    })).filter((l) => l.accepted + l.rejected > 0);
    const payload = {
      receiverName: String(f.get('receiverName') || '').trim(),
      observedAt: receptionTime.current || (receptionTime.current = new Date().toISOString()),
      notes: String(f.get('notes') || '').trim() || undefined,
      evidenceRef: String(f.get('evidenceRef') || '').trim() || undefined,
      items,
    };
    act(() => submitOnce('/client-deliveries/' + shipment.id + '/confirm', payload), () => { form.reset(); receptionTime.current = null; });
  }
  return (
    <form onSubmit={save} className={styles.form}>
      <label className="field">Nombre de quien recibe del lado del cliente
        <input name="receiverName" required maxLength={120} />
      </label>
      {pending.map(({ line, left }) => (
        <fieldset className={styles.line} key={line.id}>
          <legend>{line.orderLine.product.sku}: {left} por confirmar</legend>
          <label className="field">Aceptado <input type="number" name={'accepted-' + line.id} defaultValue="0" min="0" max={left}/></label>
          <label className="field">Rechazado <input type="number" name={'rejected-' + line.id} defaultValue="0" min="0" max={left}/></label>
        </fieldset>
      ))}
      <label className="field">Observaciones / motivo del rechazo
        <input name="notes" maxLength={500} placeholder="Obligatorio si hay rechazo"/>
      </label>
      <label className="field">Referencia de acuse, firma o bitácora
        <input name="evidenceRef" maxLength={200}/>
      </label>
      <button disabled={busy} className="primary">Confirmar recepción del cliente</button>
      <p className={styles.notice}>Lo rechazado sigue bajo custodia hasta una devolución inspeccionada. No regresa automáticamente a inventario.</p>
    </form>
  );
}

export function ClientDeliveryPanel({ order }) {
  const { data, act, busy } = useWorkspace();
  const trips = data.trips.filter(t => t.orderId === order.id && t.status === 'ACTIVE');
  const shipments = data.clientDeliveries.filter((shipment) => shipment.orderId === order.id);
  const shipped = new Map();
  const received = new Map();
  let rejected = 0;
  for (const shipment of shipments) {
    for (const line of shipment.lines) shipped.set(line.orderLineId, (shipped.get(line.orderLineId) || 0) + line.quantity);
    for (const receipt of shipment.receptions) for (const line of receipt.lines) {
      const shipmentLine = shipment.lines.find((x) => x.id === line.shipmentLineId);
      if (shipmentLine) received.set(shipmentLine.orderLineId, (received.get(shipmentLine.orderLineId) || 0) + line.accepted);
      rejected += line.rejected;
    }
  }
  const eligible = order.lines.map((line) => ({
    line,
    available: Math.max(0, line.accepted - (shipped.get(line.id) || 0)),
  })).filter((x) => x.available > 0);
  const allDelivered = order.lines.length > 0 && order.lines.every((line) => (received.get(line.id) || 0) >= line.required);
  const anyDelivered = [...received.values()].some((n) => n > 0);
  const commercialStatus = allDelivered && rejected === 0 && order.status !== 'BLOCKED'
    ? 'ENTREGADO CONFORME'
    : rejected > 0 ? 'CON INCIDENCIAS'
    : anyDelivered ? 'ENTREGA PARCIAL'
    : shipments.length ? 'EN REPARTO' : 'PENDIENTE DE REPARTO';
  function send(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const items = eligible.map(({ line }) => ({
      orderLineId: line.id,
      quantity: Number(f.get('send-' + line.id) || 0),
    })).filter((x) => x.quantity > 0);
    act(() => submitOnce('/client-deliveries/dispatch', {
      orderId: order.id, custodian: String(f.get('custodian') || '').trim(),
      reference: String(f.get('reference') || '').trim() || undefined,
      ...(f.get('tripId') ? { tripId: f.get('tripId') } : {}),
      items,
    }));
  }
  return (
    <Panel title="Entrega efectiva al cliente" description="El abastecimiento interno y la entrega final son eventos distintos.">
      <p className={styles.status}>Estado comercial de entrega: <strong>{commercialStatus}</strong></p>
      <Table headers={['Producto','Requerido','Abastecido','Salido al cliente','Recibido por cliente']}
        rows={order.lines.map((line) => ({
          key: line.id,
          cells: [line.product.sku, line.required, line.accepted,
            shipped.get(line.id) || 0, received.get(line.id) || 0],
        }))}/>
      <LocalStockForm order={order} />
      {eligible.length > 0 && order.status !== 'BLOCKED' && order.status !== 'CANCELLED' && (
        <form onSubmit={send} className={styles.form}>
          <h3>Registrar salida comercial</h3>
          <label className="field">Chofer o custodio <input required name="custodian" maxLength={120}/></label>
          <label className="field">Referencia de bitácora o remisión
            <input name="reference" maxLength={200}/>
          </label>
          <label className="field">Viaje y chofer registrado (opcional)
            <select name="tripId" defaultValue=""><option value="">Sin viaje asociado</option>
              {trips.map(t=><option key={t.id} value={t.id}>Viaje {t.id.slice(0,8)} · activo</option>)}
            </select>
          </label>
          {eligible.map(({ line, available }) => (
            <label className="field" key={line.id}>
              {line.product.sku} · Máximo disponible: {available}
              <input type="number" name={'send-' + line.id} min="0" max={available} defaultValue={available}/>
            </label>
          ))}
          <button disabled={busy} className="primary">Confirmar salida a cliente</button>
        </form>
      )}
      <div className={styles.shipments}>
        {shipments.map((shipment) => (
          <details key={shipment.id} className={styles.shipment}>
            <summary>Salida {formatDate(shipment.dispatchedAt)} · Custodio: {shipment.custodian} · {shipment.receptions.length} conformidad(es)</summary>
            <ClientReceptionForm shipment={shipment}/>
          </details>
        ))}
        {!shipments.length && <p className={styles.notice}>No existe salida ni recepción comercial confirmada.</p>}
      </div>
    </Panel>
  );
}
