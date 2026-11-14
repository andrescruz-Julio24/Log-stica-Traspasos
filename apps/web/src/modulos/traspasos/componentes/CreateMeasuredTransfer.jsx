'use client';
import { useState } from 'react';
import styles from '../styles/CreateMeasuredTransfer.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function CreateMeasuredTransfer() {
  const { data, act, busy } = useWorkspace();
  const [lines, setLines] = useState([0]);
  const products = data.products.filter(p => p.baseUnit && p.baseUnit !== 'PIEZA');
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/measured-transfers', {
      originId: f.get('originId'), destinationId: f.get('destinationId'),
      items: lines.map(i => ({
        productId: f.get('product-' + i),
        requested: String(f.get('requested-' + i)).replace(',', '.'),
        ...(f.get('packages-' + i) ? { estimatedPackages: Number(f.get('packages-' + i)) } : {}),
        ...(f.get('average-' + i) ? { averageWeightKg: String(f.get('average-' + i)).replace(',', '.') } : {}),
      })),
    }), () => { form.reset(); setLines([0]); });
  }
  return <details className={styles.container}>
    <summary>Crear solicitud de traspaso por KG o caja</summary>
    <form className={styles.form} onSubmit={save}>
      <label className="field">Origen
        <select name="originId" required defaultValue=""><option value="">Seleccionar</option>
          {data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="field">Destino
        <select name="destinationId" required defaultValue=""><option value="">Seleccionar</option>
          {data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      {lines.map(i => <fieldset className={styles.line} key={i}>
        <legend>Producto {i+1}</legend>
        <label className="field">Producto
          <select name={'product-' + i} required defaultValue=""><option value="">Seleccionar</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.baseUnit})</option>)}
          </select>
        </label>
        <label className="field">Cantidad solicitada (unidad del producto)
          <input name={'requested-' + i} required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
        </label>
        <label className="field">Cajas estimadas (opcional)
          <input name={'packages-' + i} type="number" step="1" min="0" />
        </label>
        <label className="field">Peso promedio kg (opcional, solo KG)
          <input name={'average-' + i} inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" />
        </label>
        {lines.length > 1 && <button type="button" className="secondary" onClick={() => setLines(x => x.filter(y => y !== i))}>Quitar</button>}
      </fieldset>)}
      <button type="button" className="secondary" onClick={() => setLines(s => [...s, Math.max(...s)+1])}>Agregar producto</button>
      <button className="primary" disabled={busy || !products.length}>Crear solicitud de traspaso medido</button>
      <p className={styles.note}>La cantidad teórica y las cajas estimadas no sustituyen el peso real de despacho y recepción. Nunca se mezclan unidades sin conversión aprobada.</p>
    </form>
  </details>;
}
