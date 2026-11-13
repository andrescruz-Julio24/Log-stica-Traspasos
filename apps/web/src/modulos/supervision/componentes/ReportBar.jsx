'use client';
import { percentage } from '../../../shared/utils/quantities';
import styles from '../styles/reports.module.css';

export function ReportBar({ label, value, total }) {
  return (
    <div className={styles.bar}>
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <div className="progress-track">
        <div style={{ width: percentage(value, total) + '%' }} />
      </div>
    </div>
  );
}
