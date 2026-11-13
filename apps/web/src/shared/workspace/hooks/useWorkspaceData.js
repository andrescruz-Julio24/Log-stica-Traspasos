'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyWorkspaceData } from '../data/queries';
import { loadResource } from '../services/workspace.service';

export function useWorkspaceData(query) {
  const keys = query.resources;
  const [resources, setResources] = useState({});
  const [action, setAction] = useState({ error: '', notice: '' });
  const [busy, setBusy] = useState(false);
  const requests = useRef(new Map());
  const mounted = useRef(false);

  const read = useCallback((key, force = false) => {
    const pending = requests.current.get(key);
    if (pending && !force) return pending.promise;
    pending?.controller.abort();
    const controller = new AbortController();
    setResources((previous) => ({
      ...previous,
      [key]: { ...previous[key], status: 'loading', error: '' },
    }));
    const promise = loadResource(key, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted)
          setResources((previous) => ({
            ...previous,
            [key]: { status: 'success', value },
          }));
        return value;
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResources((previous) => ({
            ...previous,
            [key]: {
              value: [401, 403].includes(error.status)
                ? undefined
                : previous[key]?.value,
              status: 'error',
              error: error.message,
            },
          }));
          throw error;
        }
      })
      .finally(() => {
        if (requests.current.get(key)?.controller === controller)
          requests.current.delete(key);
      });
    requests.current.set(key, { controller, promise });
    return promise;
  }, []);
  useEffect(() => {
    mounted.current = true;
    const pending = requests.current;
    keys.forEach((key) => {
      read(key).catch(() => {});
    });
    return () => {
      mounted.current = false;
      for (const request of pending.values()) request.controller.abort();
      pending.clear();
    };
  }, [keys, read]);

  async function reload(force = false) {
    const results = await Promise.allSettled(
      keys.map((key) => read(key, force)),
    );
    const error = results.find((result) => result.status === 'rejected');
    if (error) throw error.reason;
  }
  const complete = keys.every((key) => resources[key]?.status === 'success');
  const data = Object.assign(
    {},
    emptyWorkspaceData,
    ...keys.map((key) => resources[key]?.value),
  );
  const required = query.required ?? (query.partial ? [] : keys);
  const missingRequired = required.some(
    (key) => !resources[key]?.value || resources[key].status === 'error',
  );
  const anyValid = keys.some((key) => resources[key]?.value);
  const loading =
    (missingRequired || !anyValid) &&
    keys.some((key) => !resources[key] || resources[key].status === 'loading');
  const loadFailed = !loading && (missingRequired || !anyValid);

  async function act(task, onSuccess) {
    if (!complete) return false;
    setBusy(true);
    setAction({ error: '', notice: '' });
    try {
      await task();
      if (!mounted.current) return true;
      onSuccess?.();
      setAction({ error: '', notice: 'Operación confirmada por el servidor.' });
      await reload(true).catch(() => {}); // Cada lectura publica su propio error y reintento.
      return true;
    } catch (err) {
      if (mounted.current) setAction({ error: err.message, notice: '' });
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return {
    data,
    resources,
    keys,
    complete,
    loading,
    loadFailed,
    saving: busy,
    busy: busy || !complete,
    ...action,
    setError: (error) => setAction((previous) => ({ ...previous, error })),
    setNotice: (notice) => setAction((previous) => ({ ...previous, notice })),
    retry: (key) => read(key),
    reload,
    act,
  };
}
