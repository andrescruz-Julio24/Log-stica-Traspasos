'use client';
import styles from '../styles/Panel.module.css';

export function Panel({
  title,
  description,
  subtitle,
  actions,
  action,
  children,
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2>{title}</h2>
          {(description || subtitle) && <p>{description || subtitle}</p>}
        </div>
        {(actions || action) && (
          <div className={styles.actions}>{actions || action}</div>
        )}
      </div>
      {children}
    </section>
  );
}
