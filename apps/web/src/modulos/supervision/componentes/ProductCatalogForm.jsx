'use client';
import styles from '../styles/ProductCatalogForm.module.css';
import { useWorkspace } from '../../../shared/workspace/hooks/useWorkspace';
import { submitOnce } from '../../../shared/services/apiClient';

export function ProductCatalogForm() {
  const { act, busy } = useWorkspace();
  function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    act(() => submitOnce('/products', {
      name: String(f.get('name') || '').trim(),
      baseUnit: f.get('baseUnit'),
      presentation: String(f.get('presentation') || '').trim() || undefined,
      variant: String(f.get('variant') || '').trim() || undefined,
      externalLabel: String(f.get('externalLabel') || '').trim() || undefined,
    }), () => form.reset());
  }
  return <details className={styles.container}>
    <summary>Registrar producto en el catálogo</summary>
    <form className={styles.form} onSubmit={save}>
      <label className="field">Nombre / descripción
        <input name="name" required maxLength={180} />
      </label>
      <label className="field">Unidad de inventario
        <select name="baseUnit" defaultValue="PIEZA">
          <option value="PIEZA">Pieza</option>
          <option value="KG">Kilogramo</option>
          <option value="CAJA">Caja</option>
        </select>
      </label>
      <label className="field">Presentación
        <input name="presentation" maxLength={120} placeholder="Ej. bolsa, caja 100 pzas" />
      </label>
      <label className="field">Variante
        <input name="variant" maxLength={120} placeholder="Ej. medida o material" />
      </label>
      <label className="field">Etiqueta / nombre anterior
        <input name="externalLabel" maxLength={160} placeholder="Referencia del almacén" />
      </label>
      <button type="submit" className="primary" disabled={busy}>Crear producto con código interno</button>
      <p className={styles.note}>SGTL asigna un código interno único sin fingir que existía un código estándar en el papel. No aplica conversiones automáticas entre unidades.</p>
    </form>
  </details>;
}
