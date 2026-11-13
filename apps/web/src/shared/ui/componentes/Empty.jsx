'use client';
import styles from '../styles/Empty.module.css';

export function Empty({
  message = 'No hay registros para esta vista.',
  children,
}) {
  return (
    <div className={styles.empty} role="status">
      {children || message}
    </div>
  );
}
