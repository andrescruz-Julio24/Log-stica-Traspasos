'use client';
import Link from 'next/link';
import { submit } from '../../../shared/services/apiClient';
import { priorities } from '../../pedidos/data/priorities';
import { activeReserved } from '../../../shared/utils/quantities';
import { useState } from 'react';
import { useTransferMovements } from '../hooks/useTransferMovements';
import { Quantity, Select } from '../../../shared/components/FormFields';

export function TransferDetail({ transfer, orders, busy, onAction }) {
  const [productId, setProduct] = useState(transfer.lines[0]?.productId || ''),
    [quantity, setQuantity] = useState('1'),
    [orderLineId, setOrderLine] = useState(''),
    [presented, setPresented] = useState('1'),
    [accepted, setAccepted] = useState('1');
  const [allocationId, setAllocation] = useState('');
  const [dispatchId, setDispatch] = useState(''),
    [notes, setNotes] = useState(''),
    [custodian, setCustodian] = useState('');
  const { reserve, submitMovement } = useTransferMovements(transfer.id);
  const line = transfer.lines.find((l) => l.productId === productId);
  const assigned =
    transfer.dispatches
      .find((d) => d.id === dispatchId)
      ?.lines.find((l) => l.productId === productId)?.allocations || [];
  const candidates = orders
    .filter(
      (o) =>
        o.destinationId === transfer.destinationId && o.status !== 'CANCELLED',
    )
    .flatMap((o) =>
      o.lines
        .filter((l) => l.productId === productId)
        .map((l) => ({
          id: l.id,
          name:
            o.code +
            ' · ' +
            o.customer +
            ' · ' +
            priorities[o.priority] +
            ' (' +
            (l.required - l.accepted) +
            ' faltantes)',
        })),
    );
  const qty = Number(quantity),
    a = Number(accepted),
    p = Number(presented);
  return (
    <>
      <div className="detail">
        <h3>Operar {transfer.code}</h3>
        <p className="muted">
          Origen: {transfer.origin.name} · Destino: {transfer.destination.name}
        </p>
        <div className="form-grid">
          <Select
            label="Producto"
            value={productId}
            onChange={(x) => {
              setProduct(x);
              setOrderLine('');
              setAllocation('');
            }}
            items={transfer.lines.map((l) => ({
              id: l.productId,
              name: l.product.sku + ' · ' + l.product.name,
            }))}
          />
          <Quantity value={quantity} onChange={setQuantity} />
          <label className="field full">
            <span>
              Asignación prevista a cliente (opcional, antes de reservar)
            </span>
            <select
              value={orderLineId}
              onChange={(e) => setOrderLine(e.target.value)}
            >
              <option value="">Sin pedido asociado</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field full">
            Custodio del despacho
            <input
              value={custodian}
              onChange={(e) => setCustodian(e.target.value)}
            />
          </label>
          <div className="actions full">
            <button
              disabled={busy || !line || !Number.isSafeInteger(qty) || qty < 1}
              className="primary"
              onClick={() =>
                onAction(() =>
                  reserve({
                    transferLineId: line.id,
                    quantity: qty,
                    ...(orderLineId ? { orderLineId } : {}),
                  }),
                )
              }
            >
              1. Reservar
            </button>
            <button
              disabled={
                busy ||
                !line ||
                !Number.isSafeInteger(qty) ||
                qty < 1 ||
                qty > line.picked
              }
              className="secondary"
              onClick={() =>
                onAction(() =>
                  submitMovement(
                    'dispatches',
                    { productId, quantity: qty },
                    custodian ? { custodian } : {},
                  ),
                )
              }
            >
              2. Despachar
            </button>
          </div>
          <p className="full">
            Unidades separadas del SKU: {line?.picked ?? 0}.{' '}
            <Link href="/preparacion">Confirmar surtido en Preparación</Link>
          </p>
          <label className="field full">
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
                  { reason: notes },
                ),
              ).then((ok) => {
                if (ok) {
                  setDispatch('');
                  setNotes('');
                }
              })
            }
          >
            Finalizar inspección y registrar faltantes
          </button>
        </div>
      </div>
      <div className="line-summary">
        {transfer.lines.map((l) => (
          <div key={l.id}>
            <strong>{l.product.sku}</strong> · Solicitado {l.requested} ·
            Despachado {l.dispatched} · Aceptado {l.accepted} · Reservas{' '}
            {activeReserved(l)}
          </div>
        ))}
      </div>
    </>
  );
}
