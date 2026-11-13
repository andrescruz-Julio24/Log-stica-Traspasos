'use client';
import { useMemo, useState } from 'react';
import { reservationSummary } from '../utils/reservationSummary';

export function useReservations(data) {
  const [q, setQ] = useState('');
  const summary = useMemo(() => reservationSummary(data, q), [data, q]);
  return { q, setQ, ...summary };
}
