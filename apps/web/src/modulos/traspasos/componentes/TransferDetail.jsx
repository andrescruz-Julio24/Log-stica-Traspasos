'use client';
import Link from 'next/link';
import styles from '../styles/TransferDetail.module.css';
import { ReceiptControls } from './ReceiptControls';
import { priorities } from '../../pedidos/data/priorities';
import { activeReserved } from '../../../shared/utils/quantities';
import { useState } from 'react';
import { useTransferMovements } from '../hooks/useTransferMovements';
import { Quantity, Select } from '../../../shared/componentes/FormFields';

export function TransferDetail({ transfer, orders, busy, onAction }) {
  const [productId, setProduct] = useState(transfer.lines[0]?.productId || ''),
    [quantity, setQuantity] = useState('1'),
    [orderLineId, setOrderLine] = useState('');
  const [custodian, setCustodian] = useState(''),
    [allocationId, setAllocation] = useState('');
  const { reserve, submitMovement } = useTransferMovements(transfer.id);
  const line = transfer.lines.find((l) => l.productId === productId);
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
  const qty = Number(quantity);
  return (
    <>
      <div className={styles.detail}>
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
          <div className={`${styles.actions} full`}>
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
          <ReceiptControls
            {...{
              transfer,
              orders,
              line,
              busy,
              onAction,
              submitMovement,
              allocationId,
              setAllocation,
            }}
          />
        </div>
      </div>
      <div className={styles.lineSummary}>
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
