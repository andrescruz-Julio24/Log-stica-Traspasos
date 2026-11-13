'use client';
import { useState } from 'react';
import { submit } from '../../../shared/services/apiClient';
export function CreateIncident({ data, busy, act }) {
  const [transferId, select] = useState('');
  const transfer = data.transfers.find((t) => t.id === transferId);
  function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const b = Object.fromEntries([...f].filter(([, v]) => v !== ''));
    if (b.quantity) b.quantity = Number(b.quantity);
    act(() => submit('/incidents', { ...b, blocking: f.has('blocking') }));
  }
  return (
    <form className="form-grid" onSubmit={save}>
      <label className="field">
        Tipo
        <select name="type">
          {[
            'FALTANTE',
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
          onChange={(e) => select(e.target.value)}
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
        <select name="dispatchId" key={transferId}>
          <option value="">Sin despacho</option>
          {transfer?.dispatches.map((d) => (
            <option key={d.id}>{d.id}</option>
          ))}
        </select>
      </label>
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
