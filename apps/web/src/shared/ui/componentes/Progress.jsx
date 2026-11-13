'use client';
import styles from '../styles/Progress.module.css';
import { percentage } from '../../utils/quantities';

export function Progress({ actual, total }) {
  const pct = percentage(actual, total);
  return (
    <div
      className={styles.progress}
      aria-label={actual + ' de ' + total + ' unidades'}
    >
      <div className={styles.track}>
        <div style={{ width: pct + '%' }} />
      </div>
      <span>
        {actual} / {total} ({pct}%)
      </span>
    </div>
  );
}
