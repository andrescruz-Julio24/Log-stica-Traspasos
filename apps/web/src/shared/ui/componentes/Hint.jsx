'use client';
import styles from '../styles/Hint.module.css';

export function Hint({ title, children, warning = false }) {
  return (
    <div className={[styles.hint, warning && styles.warning].filter(Boolean).join(' ')} role="note">
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}
