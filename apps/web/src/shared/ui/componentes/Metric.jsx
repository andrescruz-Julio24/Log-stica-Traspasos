'use client';
import styles from '../styles/Metric.module.css';

export function Metric({ label, value, detail }) {
  return (
    <div className={styles.metric}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
