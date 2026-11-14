'use client';
import { useState } from 'react';
import styles from '../styles/CreateSupplierReceipt.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
import { Panel } from '../../../shared/ui/ModuleKit';

export function CreateSupplierReceipt() {
  const { data, act, busy } = useWorkspace();
  const [lines, setLines] = useState([0]);
  function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const items = lines.map((i) => ({
      productId: f.get('product-' + i),
      expected: String(f.get('expected-' + i) || '').replace(',', '.'),
    }));
    act(() => submitOnce('/supplier-receipts', {
      supplier: String(f.get('supplier') || '').trim(),
      destinationId: f.get('destinationId'),
      reference: String(f.get('reference') || '').trim() || undefined,
      items,
    }), () => { form.reset(); setLines([0]); });
  }
  return (
    <Panel title="Registrar llegada prevista del proveedor" description="Cada ingreso tiene origen externo, destino real, productos, cantidades y referencia de remisión. No aumenta las existencias hasta inspeccionarlo.">
      <form className={styles.form} onSubmit={save}>
        <label className="field">Proveedor <input name="supplier" required maxLength={150} /></label>
        <label className="field">Ubicación que recibe
          <select name="destinationId" required defaultValue=""><option value="">Seleccionar</option>
            {data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="field">Folio / remisión (opcional) <input name="reference" maxLength={200} /></label>
        <div className={styles.lines}>
          {lines.map((i) => <div key={i} className={styles.line}>
            <label className="field">Producto
              <select required name={'product-' + i} defaultValue=""><option value="">Seleccionar</option>
                {data.products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sku} ({p.baseUnit || 'PIEZA'})</option>)}
              </select>
            </label>
            <label className="field">Cantidad declarada
              <input required name={'expected-' + i} inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,3})?" placeholder="Ej. 29.400" />
            </label>
            {lines.length > 1 && <button type="button" className="secondary" onClick={() => setLines(s => s.filter(x => x !== i))}>Quitar</button>}
          </div>)}
          <button type="button" className="secondary" onClick={() => setLines(s => [...s, Math.max(...s) + 1])}>Agregar otro producto</button>
        </div>
        <button type="submit" className="primary" disabled={busy}>Registrar ingreso previsto</button>
      </form>
    </Panel>
  );
}
