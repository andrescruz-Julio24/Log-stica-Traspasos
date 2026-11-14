'use client';
import styles from '../styles/CreateWeightOrder.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
export function CreateWeightOrder() {
  const { data, act, busy } = useWorkspace();
  const products = data.products.filter(p => p.baseUnit === 'KG');
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/weight-orders', {
      customer: String(f.get('customer')).trim(), destinationId: f.get('destinationId'),
      productId: f.get('productId'), plannedKg: String(f.get('plannedKg')).replace(',', '.'),
      ...(f.get('estimatedBoxes') ? { estimatedBoxes: Number(f.get('estimatedBoxes')) } : {}),
      ...(f.get('averageBoxKg') ? { averageBoxKg: String(f.get('averageBoxKg')).replace(',', '.') } : {}),
      ...(f.get('dueAt') ? { dueAt: new Date(String(f.get('dueAt'))).toISOString() } : {}),
    }), () => form.reset());
  }
  return <form className={styles.form} onSubmit={save}>
    <h3>Registrar pedido comercial por kilogramo</h3>
    <label className="field">Cliente<input required name="customer" maxLength={150}/></label>
    <label className="field">Área desde la que se entregará
      <select required name="destinationId" defaultValue=""><option value="">Seleccionar</option>
        {data.locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </label>
    <label className="field">Producto vendido por KG
      <select required name="productId" defaultValue=""><option value="">Seleccionar</option>
        {products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
      </select>
    </label>
    <label className="field">Peso teórico solicitado (kg)
      <input required name="plannedKg" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" placeholder="30.000"/>
    </label>
    <label className="field">Cajas estimadas (opcional)
      <input name="estimatedBoxes" type="number" min="1" step="1"/>
    </label>
    <label className="field">Peso promedio de referencia por caja (kg)
      <input name="averageBoxKg" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?"/>
    </label>
    <label className="field">Compromiso de entrega
      <input name="dueAt" type="datetime-local"/>
    </label>
    <button className="primary" disabled={busy || !products.length}>Registrar pedido por peso</button>
    <p className={styles.note}>El peso nominal y la cantidad estimada de cajas son datos distintos. El precio no se calcula automáticamente.</p>
  </form>;
}
