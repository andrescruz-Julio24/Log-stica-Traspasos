'use client';
import { useMemo, useState } from 'react';
import { movementEvents } from '../utils/movementEvents';

export function useMovements(transfers) {
  const [q, setQ] = useState('');
  const events = useMemo(() => movementEvents(transfers, q), [transfers, q]);
  return { q, setQ, events };
}
