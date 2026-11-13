'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../shared/services/apiClient';

/** Consulta el historial del pedido y cancela lecturas al cambiar de folio. */
export function useOrderHistory(id) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setEvents([]);
    setError('');
    api('/orders/' + id + '/history', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setEvents(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [id]);
  return { events, error };
}
