'use client';
import { useMemo, useState } from 'react';
import { deriveAlerts } from '../utils/alerts';

export function useAlerts(data) {
  const [q, setQ] = useState('');
  const alerts = useMemo(() => deriveAlerts(data, q), [data, q]);
  return { q, setQ, alerts };
}
