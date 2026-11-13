'use client';
import { percentage } from '../../../shared/utils/quantities';
import styles from '../styles/ReportBar.module.css';

export function ReportBar({ label, value, total }) {
  return (
    <div className={styles.bar}>
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <div className={styles.track}>
        <div style={{ width: percentage(value, total) + '%' }} />
      </div>
    </div>
  );
}
