'use client';
import styles from '../styles/CreateIncident.module.css';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
export function CreateIncident({ data, busy, act }) {
  const [transferId, select] = useState('');
  const [type, setType] = useState('FALTANTE'),
    [dispatchId, setDispatch] = useState('');
  const transfer = data.transfers.find((t) => t.id === transferId);
  function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const b = Object.fromEntries([...f].filter(([, v]) => v !== ''));
    if (b.quantity) b.quantity = Number(b.quantity);
    act(() => submit('/incidents', { ...b, blocking: f.has('blocking') }));
  }
  return (
    <form className={`form-grid ${styles.form}`} onSubmit={save}>
      <label className="field">
        Tipo
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {[
            'FALTANTE',
            'RETENCION',
            'EXCEDENTE',
            'PRODUCTO_INCORRECTO',
            'VARIANTE_INCORRECTA',
            'DAÑO',
            'RETRASO',
            'OTRO',
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Traspaso
        <select
          name="transferId"
          value={transferId}
          onChange={(e) => {
            select(e.target.value);
            setDispatch('');
          }}
        >
          <option value="">General</option>
          {data.transfers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Despacho
        <select
          name="dispatchId"
          value={dispatchId}
          onChange={(e) => setDispatch(e.target.value)}
        >
          <option value="">Sin despacho</option>
          {transfer?.dispatches.map((d) => (
            <option key={d.id}>{d.id}</option>
          ))}
        </select>
      </label>
      {type === 'RETENCION' && (
        <>
          <label className="field">
            Pedido y asignación aceptada
            <select
              name="allocationId"
              required
              defaultValue=""
              key={dispatchId}
            >
              <option value="">Seleccionar</option>
              {transfer?.dispatches
                .find((d) => d.id === dispatchId)
                ?.lines.flatMap((l) =>
                  l.allocations
                    .filter((a) => a.accepted && a.reservation.orderLineId)
                    .map((a) => {
                      const o = data.orders.find((o) =>
                        o.lines.some((x) => x.id === a.reservation.orderLineId),
                      );
                      return (
                        <option key={a.id} value={a.id}>
                          {o?.code} · {o?.customer} ·{' '}
                          {
                            transfer.lines.find(
                              (x) => x.productId === l.productId,
                            )?.product.sku
                          }{' '}
                          · {a.accepted} aceptadas
                        </option>
                      );
                    }),
                )}
            </select>
          </label>
          <label className="field">
            Responsable de liberar
            <input name="assignedTo" required />
          </label>
        </>
      )}
      {[
        ['SKU observado', 'sku'],
        ['Cantidad observada', 'quantity'],
        ['Ubicación de resguardo', 'location'],
        ['Custodio', 'custodian'],
        ['Referencia de evidencia', 'evidence'],
      ].map(([label, name]) => (
        <label className="field" key={name}>
          {label}
          <input
            name={name}
            type={name === 'quantity' ? 'number' : 'text'}
            min="1"
          />
        </label>
      ))}
      <label className="field full">
        Descripción
        <textarea name="notes" required />
      </label>
      <label>
        <input type="checkbox" name="blocking" defaultChecked /> Bloquea cierre
        conforme
      </label>
      <button disabled={busy} className="primary full">
        Registrar incidencia
      </button>
    </form>
  );
}
