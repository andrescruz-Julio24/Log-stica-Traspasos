'use client';
import styles from '../styles/ReceiptControls.module.css';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
import { Quantity } from '../../../shared/componentes/FormFields';
export function ReceiptControls({
  transfer,
  orders,
  line,
  busy,
  onAction,
  submitMovement,
  allocationId,
  setAllocation,
}) {
  const productId = line?.productId;
  const [presented, setPresented] = useState('1'),
    [accepted, setAccepted] = useState('1');
  const [dispatchId, setDispatch] = useState(''),
    [notes, setNotes] = useState(''),
    [assignedTo, setAssignedTo] = useState('');
  const p = Number(presented),
    a = Number(accepted);
  const assigned =
    transfer.dispatches
      .find((d) => d.id === dispatchId)
      ?.lines.find((l) => l.productId === productId)?.allocations || [];
  return (
    <>
      <label className={`field full ${styles.dispatchPicker}`}>
        Despacho a inspeccionar
        <select
          value={dispatchId}
          onChange={(e) => {
            setDispatch(e.target.value);
            setAllocation('');
          }}
        >
          <option value="">Seleccionar despacho</option>
          {transfer.dispatches
            .filter((d) => !d.inspectedAt)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.custodian}
              </option>
            ))}
        </select>
      </label>
      <label className="field full">
        Asignación recibida
        <select
          value={allocationId}
          onChange={(e) => setAllocation(e.target.value)}
        >
          <option value="">Aplicar orden del despacho</option>
          {assigned
            .filter((a) => a.accepted < a.quantity)
            .map((a) => {
              const customer = orders.find((o) =>
                o.lines.some((l) => l.id === a.reservation.orderLineId),
              );
              return (
                <option value={a.id} key={a.id}>
                  {customer
                    ? customer.code + ' · ' + customer.customer
                    : 'Sin cliente'}{' '}
                  · {a.quantity - a.accepted} pendientes
                </option>
              );
            })}
        </select>
      </label>
      <Quantity
        label="Presentado en recepción"
        value={presented}
        onChange={setPresented}
      />
      <Quantity
        min={0}
        label="Aceptado (no incluye rechazados)"
        value={accepted}
        onChange={setAccepted}
      />
      <button
        className="primary full"
        disabled={
          busy ||
          !line ||
          !Number.isSafeInteger(p) ||
          p < 1 ||
          accepted === '' ||
          !Number.isSafeInteger(a) ||
          !dispatchId ||
          a > p ||
          a < 0
        }
        onClick={() =>
          onAction(() =>
            submitMovement(
              'receipts',
              {
                productId,
                presented: p,
                accepted: a,
                rejected: p - a,
                ...(allocationId ? { allocationId } : {}),
              },
              { dispatchId },
            ),
          )
        }
      >
        3. Registrar recepción verificada
      </button>
      <label className="field full">
        Responsable de seguimiento si hay faltantes
        <input
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        />
      </label>
      <label className="field full">
        Conclusión de la inspección
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button
        className="secondary full"
        disabled={busy || !dispatchId || !notes.trim()}
        onClick={() =>
          onAction(() =>
            submit(
              '/transfers/' +
                transfer.id +
                '/dispatches/' +
                dispatchId +
                '/finish',
              { reason: notes, assignedTo: assignedTo.trim() },
            ),
          ).then((ok) => {
            if (ok) {
              setDispatch('');
              setNotes('');
              setAssignedTo('');
            }
          })
        }
      >
        Finalizar inspección y registrar faltantes
      </button>
    </>
  );
}
