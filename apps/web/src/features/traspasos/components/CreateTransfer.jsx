'use client';
import { submit } from '../../../shared/services/apiClient';
import {
  ProductLines,
  readLines,
} from '../../../shared/components/ProductLines';
export function CreateTransfer({ data, busy, act }) {
  function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act(() =>
      submit('/transfers', {
        originId: f.get('originId'),
        destinationId: f.get('destinationId'),
        items: readLines(f, 'requested'),
      }),
    );
  }
  return (
    <form className="form-grid" onSubmit={save}>
      {[
        ['Origen', 'originId'],
        ['Destino', 'destinationId'],
      ].map(([label, name], i) => (
        <label key={name} className="field">
          {label}
          <select name={name} required defaultValue={data.locations[i]?.id}>
            {data.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      <ProductLines products={data.products} field="requested" />
      <button disabled={busy} className="primary full">
        Crear traspaso
      </button>
    </form>
  );
}
