'use client';
import { useState } from 'react';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { Panel } from '../../../shared/ui/ModuleKit';
import { submit } from '../../../shared/services/apiClient';
import { types } from '../data/exceptionTypes';
import { exceptionTargets } from '../utils/exceptionTargets';
export function ExceptionRequestForm() {
  const { data, act, busy } = useWorkspace(),
    [kind, setKind] = useState('CANCEL_ORDER'),
    [target, setTarget] = useState('');
  const options = exceptionTargets(data);
  const chosen = options.REASSIGN.find((r) => r.id === target);
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
  );
}
