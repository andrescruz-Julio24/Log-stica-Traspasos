'use client';
import styles from '../styles/Status.module.css';

const stateLabels = {
  BLOCKED: 'Retenido',
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  READY: 'Listo para preparar',
  CANCELLED: 'Cancelado',
  REQUESTED: 'Solicitado',
  PREPARING: 'En preparación',
  DISPATCHED: 'Despachado',
  IN_TRANSIT: 'En tránsito',
  RECEIVING: 'En recepción',
  CLOSED: 'Cerrado (demo)',
  OPEN: 'Abierta',
  RESOLVED: 'Resuelta',
};
export function Status({ value }) {
  const label = stateLabels[value] || value || 'Sin estado';
  const tone = ['READY', 'RESOLVED'].includes(value)
    ? 'good'
    : ['BLOCKED', 'OPEN', 'PARTIAL', 'RECEIVING'].includes(value)
      ? 'warn'
      : 'neutral';
  return <span className={[styles.pill, styles[tone]].filter(Boolean).join(' ')}>{label}</span>;
}
