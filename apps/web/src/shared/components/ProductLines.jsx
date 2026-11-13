'use client';
import { useState } from 'react';
export function ProductLines({ products, field, initial = 1 }) {
  const [rows, setRows] = useState([0]);
  return (
    <fieldset className="full">
      <legend>Productos</legend>
      {rows.map((key, index) => (
        <div className="actions" key={key}>
          <label>
            SKU{' '}
            <select
              name="productId"
              required
              defaultValue={products[index]?.id}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad{' '}
            <input
              name={field}
              type="number"
              min="1"
              step="1"
              required
              defaultValue={initial}
            />
          </label>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows(rows.filter((x) => x !== key))}
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={rows.length >= products.length}
        onClick={() => setRows([...rows, Math.max(...rows) + 1])}
      >
        Agregar producto
      </button>
    </fieldset>
  );
}
export function readLines(form, field) {
  const amounts = form.getAll(field);
  return form
    .getAll('productId')
    .map((productId, i) => ({ productId, [field]: Number(amounts[i]) }));
}
