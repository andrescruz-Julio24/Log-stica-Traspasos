'use client';
import { useMemo, useState } from 'react';
import { searchEntries } from '../utils/searchEntries';

export function useGlobalSearch(data) {
  const [q, setQ] = useState('');
  const normalized = q.toLocaleLowerCase('es-MX').trim();
  const entries = useMemo(() => searchEntries(data, q), [data, q]);
  return { q, setQ, normalized, entries };
}
