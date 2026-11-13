'use client';
import { useState } from 'react';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';
import { Panel, Table } from '../../../shared/ui/ModuleKit';
import { submit } from '../../../shared/services/apiClient';
const types = {
  CANCEL_ORDER: 'Cancelar pedido',
  CLOSE_DIFFERENCE: 'Cerrar con diferencias',
  REASSIGN: 'Reasignar reserva en origen',
  REVERSE_RECEIPT: 'Compensar línea de recepción',
};
export function AuthorizationsPage() {
  const { data, act, busy } = useWorkspace(),
    [kind, setKind] = useState('CANCEL_ORDER'),
    [target, setTarget] = useState('');
  const reservations = data.transfers.flatMap((t) =>
    t.lines.flatMap((l) =>
      l.reservations
        .filter((r) => r.quantity && !r.released)
        .map((r) => ({
          id: r.id,
          label:
            t.code +
            ' · ' +
            l.product.sku +
            ' · ' +
            r.quantity +
            ' u. · ' +
            r.id,
          product: l.productId,
          destination: t.destinationId,
        })),
    ),
  );
  const options = {
    CANCEL_ORDER: data.orders
      .filter((o) => o.status !== 'CANCELLED')
      .map((o) => ({ id: o.id, label: o.code + ' · ' + o.customer })),
    CLOSE_DIFFERENCE: data.transfers
      .filter((t) => t.status === 'RECEIVING')
      .map((t) => ({ id: t.id, label: t.code })),
    REASSIGN: reservations,
    REVERSE_RECEIPT: data.transfers.flatMap((t) =>
      t.receipts.flatMap((r) =>
        r.lines
          .filter((l) => !l.reversed && l.applied)
          .map((l) => ({
            id: l.id,
            label:
              t.code +
              ' · ' +
              r.id +
              ' · ' +
              l.productId +
              ' · ' +
              l.accepted +
              ' aceptadas',
          })),
      ),
    ),
  };
  const chosen = reservations.find((r) => r.id === target);
  function send(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act(() =>
      submit('/authorizations', {
        kind,
        targetId: target,
        reason: f.get('reason'),
        ...(kind === 'REASSIGN' ? { orderLineId: f.get('line') } : {}),
      }),
    );
  }
  return (
    <>
      <Panel title="Solicitar una excepción">
        <form className="form-grid" onSubmit={send}>
          <label className="field">
            Operación
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setTarget('');
              }}
            >
              {Object.entries(types).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Registro
            <select
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {options[kind].map((x) => (
                <option value={x.id} key={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          {kind === 'REASSIGN' && (
            <label className="field">
              Pedido destino
              <select name="line" required>
                {data.orders
                  .filter(
                    (o) =>
                      o.destinationId === chosen?.destination &&
                      o.status !== 'CANCELLED',
                  )
                  .flatMap((o) =>
                    o.lines
                      .filter(
                        (l) =>
                          l.productId === chosen?.product &&
                          l.accepted < l.required,
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {o.code} · {o.customer}
                        </option>
                      )),
                  )}
              </select>
            </label>
          )}
          <label className="field">
            Justificación
            <input required name="reason" />
          </label>
          <button className="primary" disabled={busy}>
            Solicitar autorización
          </button>
        </form>
      </Panel>
      <Panel title="Solicitudes y decisiones">
        <Table
          headers={[
            'Operación',
            'Registro',
            'Solicitante',
            'Motivo',
            'Decisión',
          ]}
          rows={data.authorizations.map((r) => ({
            key: r.id,
            cells: [
              types[r.kind],
              r.targetId,
              r.requester,
              r.reason,
              r.status === 'PENDING' ? (
                <form
                  key="decision"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const approve = e.nativeEvent.submitter.value === 'approve';
                    const reason = new FormData(e.currentTarget).get('reason');
                    act(() =>
                      submit('/authorizations/' + r.id + '/decision', {
                        reason,
                        approve,
                      }),
                    );
                  }}
                >
                  <input
                    required
                    name="reason"
                    aria-label="Motivo de decisión"
                  />
                  <button value="approve" disabled={busy}>
                    Aprobar
                  </button>
                  <button value="deny" disabled={busy}>
                    Denegar
                  </button>
                </form>
              ) : (
                r.status + ' · ' + r.approver + ' · ' + r.decision
              ),
            ],
          }))}
        />
      </Panel>
    </>
  );
}
