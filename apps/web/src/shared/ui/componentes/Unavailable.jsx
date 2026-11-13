'use client';
import styles from '../styles/Unavailable.module.css';

export function Unavailable({ title, description, dependency }) {
  return (
    <div className={styles.unavailable}>
      <div className={styles.mark}>!</div>
      <strong>{title}</strong>
      <p>{description}</p>
      {dependency && <small>Dependencia: {dependency}</small>}
    </div>
  );
}
