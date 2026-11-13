export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
