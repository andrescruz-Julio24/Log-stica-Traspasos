'use client';
import styles from '../styles/SearchField.module.css';

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar por folio, SKU o descripción',
}) {
  return (
    <label className={styles.searchField}>
      <span className={styles.screenReaderOnly}>Buscar registros</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}
