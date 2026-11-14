'use client';
import styles from '../styles/LocalStockForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function LocalStockForm({ order }) {
  const { act, busy } = useWorkspace();
  const shortages = order.lines.filter((line) => line.accepted < line.required);
  if (order.status === 'CANCELLED' || !shortages.length) return null;
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    act(() => submitOnce('/client-deliveries/allocate-local', {
      orderLineId: data.get('orderLineId'),
      quantity: Number(data.get('quantity')),
    }));
  }
  return (
    <form className={styles.form} onSubmit={save}>
      <h3>Asignar existencias locales verificadas al cliente</h3>
      <label className="field">Producto pendiente
        <select name="orderLineId" required defaultValue="">
          <option value="">Seleccionar</option>
          {shortages.map((line) => (
            <option key={line.id} value={line.id}>
              {line.product.sku} · Faltan {line.required - line.accepted}
            </option>
          ))}
        </select>
      </label>
      <label className="field">Unidades a reservar (piezas)
        <input type="number" name="quantity" min="1" step="1" required/>
      </label>
      <button type="submit" disabled={busy} className="primary">Reservar stock local</button>
      <p className={styles.note}>Solo permite reservar cantidades del mismo producto y ubicación del pedido si existe un conteo físico concordante validado. Registra el conteo en <a href="/conteos">Conteos</a> antes de continuar. No crea traspasos internos.</p>
    </form>
  );
}
