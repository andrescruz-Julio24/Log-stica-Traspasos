'use client';
import { useEffect, useRef, useState } from 'react';
import { emptyWorkspaceData } from '../data/queries';
import { fetchWorkspaceSection } from '../services/workspace.service';

export function useWorkspaceData(section) {
  const [snapshot, setSnapshot] = useState({
    section: null,
    data: emptyWorkspaceData,
    error: '',
  });
  const [action, setAction] = useState({
    section: null,
    error: '',
    notice: '',
  });
  const [busy, setBusy] = useState(false);
  const latestRequest = useRef(0);
  useEffect(() => {
    const request = ++latestRequest.current;
    let mounted = true;
    fetchWorkspaceSection(section)
      .then((data) => {
        if (mounted && request === latestRequest.current)
          setSnapshot({ section, data, error: '' });
      })
      .catch((err) => {
        if (mounted && request === latestRequest.current)
          setSnapshot({
            section,
            data: emptyWorkspaceData,
            error: err.message,
          });
      });
    return () => {
      mounted = false;
    };
  }, [section]);
  const loading = snapshot.section !== section;
  const data = loading ? emptyWorkspaceData : snapshot.data;
  const error =
    action.section === section && action.error
      ? action.error
      : loading
        ? ''
        : snapshot.error;
  const notice = action.section === section ? action.notice : '';
  const setError = (message) =>
    setAction((prev) => ({ ...prev, section, error: message }));
  const setNotice = (message) =>
    setAction((prev) => ({ ...prev, section, notice: message }));
  async function reload() {
    const request = ++latestRequest.current;
    try {
      const result = await fetchWorkspaceSection(section);
      if (request !== latestRequest.current) return result;
      setSnapshot({ section, data: result, error: '' });
      setAction((prev) => ({ ...prev, section, error: '' }));
      return result;
    } catch (err) {
      if (request !== latestRequest.current) return;
      setSnapshot({ section, data: emptyWorkspaceData, error: err.message });
      throw err;
    }
  }
  async function act(task, onSuccess) {
    setBusy(true);
    setAction({ section, error: '', notice: '' });
    try {
      await task();
      onSuccess?.();
      try {
        await reload();
      } catch (err) {
        setAction({
          section,
          error:
            'Operación confirmada. Falló la actualización de la vista: ' +
            err.message,
          notice: '',
        });
        return true;
      }
      setAction({
        section,
        error: '',
        notice: 'Operación confirmada por el servidor.',
      });
      return true;
    } catch (err) {
      setAction({ section, error: err.message, notice: '' });
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    data,
    loading,
    loadFailed: !!snapshot.error,
    busy,
    error,
    notice,
    setError,
    setNotice,
    reload,
    act,
  };
}
