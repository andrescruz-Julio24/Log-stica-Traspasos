'use client';
import styles from '../styles/CaptureInventoryObservation.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';
import { useRef } from 'react';
import { Panel } from '../../../shared/ui/ModuleKit';

export function CaptureInventoryObservation() {
  const { data, act, busy } = useWorkspace();
  const captureTime = useRef(null);
  function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const moment = f.get('observedAt');
    const observedAt = captureTime.current || (captureTime.current = moment ? new Date(moment).toISOString() : new Date().toISOString());
    act(() => submitOnce('/inventory-observations', {
      productId: f.get('productId'),
      locationId: f.get('locationId'),
      quantity: String(f.get('quantity')).replace(',', '.'),
      unit: f.get('unit'),
      source: f.get('source'),
      method: f.get('method'),
      observedAt,
      reference: String(f.get('reference') || '').trim() || undefined,
    }), () => { form.reset(); captureTime.current = null; });
  }
  return (
    <Panel title="Registrar conteo o referencia" description="El registro digital reemplaza la libreta de papel. Después de verificar la medición, un supervisor puede aplicar un ajuste al saldo oficial.">
      <form className={styles.form} onSubmit={save}>
        <label className="field">Producto
          <select name="productId" required defaultValue=""><option value="">Seleccionar</option>
            {data.products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
          </select>
        </label>
        <label className="field">Ubicación
          <select name="locationId" required defaultValue=""><option value="">Seleccionar</option>
            {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="field">Cantidad o peso
          <input name="quantity" required inputMode="decimal" placeholder="Ej. 29.400" pattern="[0-9]+([.,][0-9]{1,3})?" />
        </label>
        <label className="field">Unidad
          <select name="unit" defaultValue="PIEZA"><option value="PIEZA">Pieza</option><option value="CAJA">Caja</option><option value="KG">Kilogramo</option></select>
        </label>
        <label className="field">Procedencia
          <select name="source" defaultValue="DIGITAL"><option value="EXCEL">Excel histórico (solo referencia)</option><option value="DIGITAL">Conteo en SGTL (registro oficial)</option></select>
        </label>
        <label className="field">Método
          <select name="method" defaultValue="COUNT"><option value="COUNT">Conteo</option><option value="WEIGHT">Pesaje</option><option value="ESTIMATE">Estimación</option></select>
        </label>
        <label className="field">Momento del conteo (opcional)
          <input name="observedAt" type="datetime-local" />
        </label>
        <label className="field">Folio, hoja o referencia (opcional)
          <input name="reference" maxLength={200} />
        </label>
        <button type="submit" className="primary" disabled={busy}>Registrar observación</button>
      </form>
      <p className={styles.warning}>Los registros de Excel son referencias, no existencias disponibles. Solo un conteo digital verificado y una autorización posterior pueden corregir el stock oficial.</p>
    </Panel>
  );
}
