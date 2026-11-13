'use client';
import { submit } from '../../../shared/services/apiClient';
import {
  ProductLines,
  readLines,
} from '../../../shared/components/ProductLines';
import { priorities } from '../data/priorities';
export function CreateOrder({ data, busy, act }) {
  function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act(() =>
      submit('/orders', {
        customer: f.get('customer'),
        destinationId: f.get('destinationId'),
        priority: f.get('priority'),
        ...(f.get('dueAt')
          ? { dueAt: new Date(f.get('dueAt')).toISOString() }
          : {}),
        items: readLines(f, 'required'),
      }),
    );
  }
  return (
    <form className="form-grid" onSubmit={save}>
      <label className="field">
        Cliente
        <input required name="customer" placeholder="Nombre del cliente" />
      </label>
      <label className="field">
        Destino
        <select required name="destinationId">
          {data.locations.map((l) => (
            <option value={l.id} key={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Prioridad
        <select name="priority" defaultValue="NORMAL">
          {Object.entries(priorities).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Fecha compromiso
        <input type="datetime-local" name="dueAt" />
      </label>
      <ProductLines products={data.products} field="required" />
      <button className="primary full" disabled={busy}>
        Crear pedido
      </button>
    </form>
  );
}
